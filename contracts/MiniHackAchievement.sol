// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MiniHackAchievement
 * @notice Admin-mintable, transferable ERC-721 awarded to participants of the
 *         Avalanche Team1 Africa Mini Hack. Only accounts holding MINTER_ROLE
 *         can mint, and DEFAULT_ADMIN_ROLE can force-transfer a badge to
 *         correct mis-sends. End-users never call mint themselves.
 *
 * @dev Mint flow:
 *  - Off-chain "quest tracker" (e.g. Tally) gathers submissions.
 *  - Server admin (holding MINTER_ROLE) batches one mint tx per quest.
 *  - Each badgeId may be re-used across many recipients (one badge type =
 *    many tokens), unlike v1 where badgeId was unique per token.
 */
contract MiniHackAchievement is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 1_000_000;

    uint256 private _nextTokenId;
    mapping(uint256 => uint256) private _tokenIdToBadgeId;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 badgeId);
    event BadgeBurned(uint256 indexed tokenId, uint256 badgeId);
    event AdminTransfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address admin) ERC721("MiniHack Achievement", "MHACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /// @notice Mint a single badge to a recipient.
    function mintTo(
        address to,
        uint256 badgeId,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _mintOne(to, badgeId, uri);
    }

    /// @notice Mint the same badge type to many recipients in one tx.
    function batchMintTo(
        address[] calldata tos,
        uint256 badgeId,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        tokenIds = new uint256[](tos.length);
        for (uint256 i = 0; i < tos.length; i++) {
            tokenIds[i] = _mintOne(tos[i], badgeId, uri);
        }
    }

    function _mintOne(address to, uint256 badgeId, string calldata uri) internal returns (uint256 tokenId) {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        require(bytes(uri).length > 0, "URI cannot be empty");
        require(to != address(0), "Zero address");

        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _tokenIdToBadgeId[tokenId] = badgeId;
        emit BadgeMinted(to, tokenId, badgeId);
    }

    /// @notice Admin-only force transfer to correct mis-sends. Bypasses approval checks.
    function adminTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) == from, "From is not owner");
        require(to != address(0), "Zero address");
        _update(to, tokenId, address(0));
        emit AdminTransfer(from, to, tokenId);
    }

    /// @notice Burn a badge (admin only).
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
