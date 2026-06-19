// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MiniHackAchievement
 * @notice Soulbound (non-transferable) ERC-721 awarded to participants of
 *         the Avalanche Team1 Africa Mini Hack. Each badge represents an
 *         on-chain proof of attendance / quest completion.
 *
 * @dev Features:
 * - Soulbound: Transfers are blocked by overriding `_update`.
 * - Role-based minting: Only `MINTER_ROLE` can mint.
 * - Per-token metadata URIs (IPFS) via ERC721URIStorage.
 * - Badge ID uniqueness enforced via mapping.
 * - Supply capped at `MAX_SUPPLY`.
 * - URI validation to prevent empty or malformed metadata.
 */
contract MiniHackAchievement is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 1_000_000;

    uint256 private _nextTokenId;
    mapping(uint256 => uint256) private _badgeIdToTokenId;
    mapping(uint256 => uint256) private _tokenIdToBadgeId;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 badgeId);
    event BadgeBurned(uint256 indexed tokenId, uint256 badgeId);

    constructor(address admin) ERC721("MiniHack Achievement", "MHACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _revokeRole(DEFAULT_ADMIN_ROLE, address(0));
    }

    /**
     * @dev Mints a soulbound badge to a recipient.
     * @param to The address to receive the badge.
     * @param badgeId The unique identifier for the badge type.
     * @param uri The metadata URI for the badge.
     * @return tokenId The ID of the minted token.
     */
    function mintTo(
        address to,
        uint256 badgeId,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        require(_badgeIdToTokenId[badgeId] == 0, "Badge ID already used");
        require(bytes(uri).length > 0, "URI cannot be empty");

        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _badgeIdToTokenId[badgeId] = tokenId;
        _tokenIdToBadgeId[tokenId] = badgeId;

        emit BadgeMinted(to, tokenId, badgeId);
    }

    /**
     * @dev Burns a soulbound badge.
     * @param tokenId The ID of the token to burn.
     */
    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 badgeId = _tokenIdToBadgeId[tokenId];
        require(badgeId != 0, "Token not found");

        _burn(tokenId);
        delete _badgeIdToTokenId[badgeId];
        delete _tokenIdToBadgeId[tokenId];

        emit BadgeBurned(tokenId, badgeId);
    }

    /**
     * @dev Returns the total supply of minted tokens.
     * @return The total number of tokens minted.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Returns the badge ID associated with a token ID.
     * @param tokenId The token ID to query.
     * @return The badge ID.
     */
    function getBadgeId(uint256 tokenId) external view returns (uint256) {
        return _tokenIdToBadgeId[tokenId];
    }

    /**
     * @dev Returns the token ID associated with a badge ID.
     * @param badgeId The badge ID to query.
     * @return The token ID.
     */
    function getTokenId(uint256 badgeId) external view returns (uint256) {
        return _badgeIdToTokenId[badgeId];
    }

    /**
     * @dev Overrides ERC721's _update to block all transfers, making tokens soulbound.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override {
        require(to == ownerOf(tokenId), "Soulbound: transfer not allowed");
        super._update(to, tokenId, auth);
    }
    function getTokenId(uint256 badgeId) external view returns (uint256) {
        return _badgeIdToTokenId[badgeId];
    }

    /// @dev Soulbound: block all transfers except mint (from = 0) and burn (to = 0).
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    // ---- required overrides ----
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