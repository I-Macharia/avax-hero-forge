// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MiniHackAchievement
 * @notice Admin-mintable ERC-721 for Avalanche Team1 Africa Mini Hack badges.
 * Quest badges (1-17) are soulbound. Leaderboard badges (18-20) are transferable.
 * 
 * @dev Badge registry ensures consistent metadata and soulbound rules per type.
 */
contract MiniHackAchievement is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 1_000_000;

    uint256 private _nextTokenId;
    mapping(uint256 => uint256) private _tokenIdToBadgeId;

    struct BadgeConfig {
        string uri;
        bool isSoulbound;
        bool registered;
    }
    mapping(uint256 => BadgeConfig) public badgeConfigs;

    event BadgeRegistered(uint256 indexed badgeId, string uri, bool isSoulbound);
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed badgeId);
    event BadgeBurned(uint256 indexed tokenId, uint256 indexed badgeId);
    event AdminTransfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address admin) ERC721("MiniHack Achievement", "MHACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Register (or update) a badge type's metadata and soulbound status.
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Idempotent.
     */
    function registerBadge(
        uint256 badgeId,
        string calldata uri,
        bool isSoulbound
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(uri).length > 0, "URI cannot be empty");
        badgeConfigs[badgeId] = BadgeConfig({
            uri: uri,
            isSoulbound: isSoulbound,
            registered: true
        });
        emit BadgeRegistered(badgeId, uri, isSoulbound);
    }

    /// @notice Check if a badge type is soulbound
    function isSoulbound(uint256 badgeId) external view returns (bool) {
        return badgeConfigs[badgeId].isSoulbound;
    }

    /// @notice Mint a single badge (pulls URI from registry)
    function mintTo(
        address to,
        uint256 badgeId
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _mintOne(to, badgeId);
    }

    /// @notice Batch mint same badge type to multiple recipients
    function batchMintTo(
        address[] calldata tos,
        uint256 badgeId
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        tokenIds = new uint256[](tos.length);
        for (uint256 i = 0; i < tos.length; i++) {
            tokenIds[i] = _mintOne(tos[i], badgeId);
        }
    }

    function _mintOne(address to, uint256 badgeId) internal returns (uint256 tokenId) {
        BadgeConfig memory config = badgeConfigs[badgeId];
        require(config.registered, "Badge not registered");
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        require(to != address(0), "Zero address");

        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, config.uri);
        _tokenIdToBadgeId[tokenId] = badgeId;

        emit BadgeMinted(to, tokenId, badgeId);
    }

    /**
     * @dev Override to enforce soulbound logic.
     * Normal transfers are blocked for soulbound tokens.
     * adminTransfer bypasses this by calling _update directly with from=owner.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) { // Transfer (not mint/burn)
            uint256 badgeId = _tokenIdToBadgeId[tokenId];
            if (badgeConfigs[badgeId].isSoulbound && auth != address(0)) {
                revert("Soulbound: transfers disabled");
            }
        }
        return super._update(to, tokenId, auth);
    }

    /// @notice Admin force transfer (bypasses soulbound check)
    function adminTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) == from, "From is not owner");
        require(to != address(0), "Zero address");
        _update(to, tokenId, address(0)); // auth=0 bypasses check
        emit AdminTransfer(from, to, tokenId);
    }

    /// @notice Burn (admin only)
    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 badgeId = _tokenIdToBadgeId[tokenId];
        _burn(tokenId);
        delete _tokenIdToBadgeId[tokenId];
        emit BadgeBurned(tokenId, badgeId);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function getBadgeId(uint256 tokenId) external view returns (uint256) {
        return _tokenIdToBadgeId[tokenId];
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
