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
 * - `mintTo(address,uint256 badgeId,string uri)` — callable by MINTER_ROLE.
 * - Transfers are blocked (soulbound) by overriding `_update`.
 * - Per-token metadata URIs (IPFS) via ERC721URIStorage.
 */
contract MiniHackAchievement is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 badgeId);

    constructor(address admin) ERC721("MiniHack Achievement", "MHACH") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mintTo(address to, uint256 badgeId, string calldata uri)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit BadgeMinted(to, tokenId, badgeId);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @dev Soulbound: block all transfers except mint (from = 0) and burn (to = 0).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    // ---- required overrides ----
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    { return super.tokenURI(tokenId); }

    function supportsInterface(bytes4 id)
        public view override(ERC721URIStorage, AccessControl) returns (bool)
    { return super.supportsInterface(id); }
}
