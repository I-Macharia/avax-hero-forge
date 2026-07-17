// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MiniHackAchievement
 * @notice Achievement badges for Avalanche MiniHack participants.
 *
 * Badge types:
 *  - Quest badges (badgeId 1-17): Soulbound. Multiple participants can earn
 *    the same badge type. Each token is unique but the art/metadata is shared
 *    per badge type (URI stored in registry, not per-token).
 *  - Leaderboard badges (badgeId 18-20): Transferable. One-of-a-kind awards
 *    for 1st, 2nd, 3rd place, still admin-minted via mintTo/batchMintTo.
 *
 * Trust model (Session 3 "AchievementBadges" pattern, adapted):
 *  The course version self-claims against a continuous on-chain points
 *  balance (`points.pointsOf(msg.sender) >= threshold`). MiniHack badges are
 *  discrete quest completions, not a points economy, so the equivalent gate
 *  here is a per-badge boolean attestation:
 *
 *  1. ORGANIZER_ROLE calls attestEligibility() once a quest submission is
 *     approved off-chain (e.g. a Tally form review). This is the "issuer
 *     verified something happened" half of the pattern.
 *  2. The participant self-claims — either by calling claimBadge() directly
 *     (they pay gas, fully non-custodial) or, for onboarding-friction
 *     reasons, a RELAYER_ROLE wallet calls claimBadgeFor() on their behalf
 *     (relayer pays gas, but the badge always mints to the participant,
 *     never to the relayer). Both paths check the same eligibility flag.
 *
 *  This replaces a design where only a backend-held admin key could ever
 *  mint a badge, with one where the backend can only *attest*, and the
 *  actual mint is either self-service or an explicitly-scoped relay.
 */
contract MiniHackAchievement is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000;
    uint256 private _nextTokenId;

    struct BadgeConfig {
        string uri;         // ipfs://CID pointing to metadata JSON
        bool isSoulbound;   // true = non-transferable (quest badges)
        bool registered;    // guard against minting unregistered badge types
    }

    mapping(uint256 => BadgeConfig) private _badgeRegistry;
    mapping(uint256 => uint256) private _tokenToBadgeId;

    /// badgeId => participant => organizer has attested completion & not yet claimed.
    /// Cleared on successful claim, doubling as the anti-replay guard.
    mapping(uint256 => mapping(address => bool)) private _eligible;
    /// badgeId => participant => permanently claimed token. A non-zero value
    /// means the participant has already received this badge type.
    mapping(uint256 => mapping(address => uint256)) private _claimedTokenId;

    // ---- Events ------------------------------------------------------------

    event BadgeRegistered(uint256 indexed badgeId, string uri, bool isSoulbound);
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed badgeId);
    event BadgeBurned(uint256 indexed tokenId, uint256 indexed badgeId);
    event AdminTransfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event EligibilityAttested(uint256 indexed badgeId, address indexed participant);
    event BadgeClaimed(
        address indexed participant,
        uint256 indexed tokenId,
        uint256 indexed badgeId,
        address relayedBy
    );

    // ---- Constructor ---------------------------------------------------------

    constructor(address admin) ERC721("MiniHack Achievement", "MHACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(ORGANIZER_ROLE, admin);
        _grantRole(RELAYER_ROLE, admin);
    }

    // ---- Admin: badge registry -----------------------------------------------

    function registerBadge(
        uint256 badgeId,
        string calldata uri,
        bool isSoulbound
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(badgeId > 0, "badgeId must be > 0");
        require(bytes(uri).length > 0, "URI cannot be empty");
        _badgeRegistry[badgeId] = BadgeConfig({ uri: uri, isSoulbound: isSoulbound, registered: true });
        emit BadgeRegistered(badgeId, uri, isSoulbound);
    }

    function getBadgeConfig(uint256 badgeId) external view returns (string memory uri, bool isSoulbound) {
        BadgeConfig storage cfg = _badgeRegistry[badgeId];
        require(cfg.registered, "Badge not registered");
        return (cfg.uri, cfg.isSoulbound);
    }

    function isBadgeRegistered(uint256 badgeId) external view returns (bool) {
        return _badgeRegistry[badgeId].registered;
    }

    // ---- Organizer: attest eligibility ----------------------------------------
    // The "issuer verified an off-chain action happened" half of the pattern.
    // This does NOT mint anything — it only unlocks the participant's own
    // claimBadge()/claimBadgeFor() call.

    function attestEligibility(uint256 badgeId, address participant) external onlyRole(ORGANIZER_ROLE) {
        require(_badgeRegistry[badgeId].registered, "Badge type not registered");
        require(participant != address(0), "Zero address");
        require(_claimedTokenId[badgeId][participant] == 0, "Badge already claimed");
        _eligible[badgeId][participant] = true;
        emit EligibilityAttested(badgeId, participant);
    }

    function batchAttestEligibility(
        uint256 badgeId,
        address[] calldata participants
    ) external onlyRole(ORGANIZER_ROLE) {
        require(_badgeRegistry[badgeId].registered, "Badge type not registered");
        for (uint256 i = 0; i < participants.length; i++) {
            address p = participants[i];
            require(p != address(0), "Zero address");
            require(_claimedTokenId[badgeId][p] == 0, "Badge already claimed");
            _eligible[badgeId][p] = true;
            emit EligibilityAttested(badgeId, p);
        }
    }

    function isEligible(uint256 badgeId, address participant) external view returns (bool) {
        return _eligible[badgeId][participant];
    }

    // ---- Self-claim (the actual mint) -----------------------------------------

    /// @notice True self-claim. Caller pays their own gas; mints to themselves.
    function claimBadge(uint256 badgeId) external returns (uint256 tokenId) {
        return _claim(badgeId, msg.sender, msg.sender);
    }

    /// @notice Sponsored claim. Only a RELAYER_ROLE wallet may call this, and
    ///         only to mint to `participant` — a relayer can never redirect
    ///         someone else's attested badge to itself or a third address.
    function claimBadgeFor(
        uint256 badgeId,
        address participant
    ) external onlyRole(RELAYER_ROLE) returns (uint256 tokenId) {
        return _claim(badgeId, participant, msg.sender);
    }

    function _claim(uint256 badgeId, address participant, address relayedBy) internal returns (uint256 tokenId) {
        require(_eligible[badgeId][participant], "Not eligible");
        require(_claimedTokenId[badgeId][participant] == 0, "Badge already claimed");
        delete _eligible[badgeId][participant]; // clear first: checks-effects-interactions
        tokenId = _mintOne(participant, badgeId);
        _claimedTokenId[badgeId][participant] = tokenId;
        emit BadgeClaimed(participant, tokenId, badgeId, relayedBy);
    }

    // ---- Admin trophy mint -----------------------------------------------------
    // MINTER_ROLE is deliberately limited to transferable badge types. Quest
    // badges must always pass through organizer attestation and claim.

    function mintTo(address to, uint256 badgeId) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(!_badgeRegistry[badgeId].isSoulbound, "Quest badges require claim");
        return _mintOne(to, badgeId);
    }

    function batchMintTo(
        address[] calldata recipients,
        uint256 badgeId
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        require(!_badgeRegistry[badgeId].isSoulbound, "Quest badges require claim");
        tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = _mintOne(recipients[i], badgeId);
        }
    }

    function _mintOne(address to, uint256 badgeId) internal returns (uint256 tokenId) {
        require(to != address(0), "Zero address");
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");

        BadgeConfig storage cfg = _badgeRegistry[badgeId];
        require(cfg.registered, "Badge type not registered");

        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, cfg.uri);
        _tokenToBadgeId[tokenId] = badgeId;

        emit BadgeMinted(to, tokenId, badgeId);
    }

    // ---- Soulbound enforcement -------------------------------------------------

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        bool isMint = (from == address(0));
        bool isBurn = (to == address(0));

        if (!isMint && !isBurn) {
            uint256 badgeId = _tokenToBadgeId[tokenId];
            if (_badgeRegistry[badgeId].isSoulbound) {
                require(auth == address(0), "Soulbound: non-transferable");
            }
        }
        return super._update(to, tokenId, auth);
    }

    // ---- Admin utilities -------------------------------------------------------

    function adminTransfer(address from, address to, uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) == from, "Not token owner");
        require(to != address(0), "Zero address");
        require(!_badgeRegistry[_tokenToBadgeId[tokenId]].isSoulbound, "Soulbound: non-transferable");
        _update(to, tokenId, address(0));
        emit AdminTransfer(from, to, tokenId);
    }

    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 badgeId = _tokenToBadgeId[tokenId];
        _burn(tokenId);
        delete _tokenToBadgeId[tokenId];
        emit BadgeBurned(tokenId, badgeId);
    }

    // ---- Views -----------------------------------------------------------------

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function getBadgeId(uint256 tokenId) external view returns (uint256) {
        return _tokenToBadgeId[tokenId];
    }

    function claimedTokenId(uint256 badgeId, address participant) external view returns (uint256) {
        return _claimedTokenId[badgeId][participant];
    }

    /// @notice Zero-storage tier over badge count (Session 3 "TierSystem" pattern).
    ///         Free to call, can never drift out of sync with actual holdings.
    function tierOf(address participant) external view returns (uint8) {
        uint256 count = balanceOf(participant);
        if (count >= 12) return 3; // Platinum
        if (count >= 6) return 2;  // Gold
        if (count >= 1) return 1;  // Silver
        return 0;                  // Unranked
    }

    // ---- Required overrides ----------------------------------------------------

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 id)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(id);
    }
}
