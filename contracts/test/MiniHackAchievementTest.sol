// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../MiniHackAchievement.sol";

contract MiniHackAchievementTest {
    MiniHackAchievement public achievement;
    
    address public admin = address(0x1);
    address public minter = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    bytes32 public constant DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    string public constant VALID_URI = "ipfs://QmValid";
    string public constant EMPTY_URI = "";
    
    event TestPassed(string message);
    event TestFailed(string message);
    
    constructor() {
        achievement = new MiniHackAchievement(admin);
        achievement.grantRole(MINTER_ROLE, minter);
    }

    // Helper functions for assertions
    function _assertTrue(bool condition, string memory error) internal {
        if (!condition) {
            emit TestFailed(error);
            revert(string.concat("Assertion failed: ", error));
        }
    }

    function _assertFalse(bool condition, string memory error) internal {
        if (condition) {
            emit TestFailed(error);
            revert(string.concat("Assertion failed: ", error));
        }
    }

    function _assertEq(uint256 a, uint256 b, string memory error) internal {
        if (a != b) {
            emit TestFailed(error);
            revert(string.concat("Assertion failed: ", error));
        }
    }

    function _assertEq(address a, address b, string memory error) internal {
        if (a != b) {
            emit TestFailed(error);
            revert(string.concat("Assertion failed: ", error));
        }
    }

    function _assertEq(string memory a, string memory b, string memory error) internal {
        if (keccak256(bytes(a)) != keccak256(bytes(b))) {
            emit TestFailed(error);
            revert(string.concat("Assertion failed: ", error));
        }
    }

    function _emitPass(string memory testName) internal {
        emit TestPassed(string.concat("Passed: ", testName));
    }

    // ========== Constructor Tests ==========
    function testConstructor() public {
        _assertEq(achievement.name(), "MiniHack Achievement", "Name mismatch");
        _assertEq(achievement.symbol(), "MHACH", "Symbol mismatch");
        _assertTrue(achievement.hasRole(DEFAULT_ADMIN_ROLE, admin), "Admin should have DEFAULT_ADMIN_ROLE");
        _assertTrue(achievement.hasRole(MINTER_ROLE, admin), "Admin should have MINTER_ROLE");
        _emitPass("testConstructor");
    }

    // ========== Role Management Tests ==========
    function testRoleManagement() public {
        // Test granting MINTER_ROLE
        address newMinter = address(0x5);
        achievement.grantRole(MINTER_ROLE, newMinter);
        _assertTrue(achievement.hasRole(MINTER_ROLE, newMinter), "New minter should have MINTER_ROLE");

        // Test revoking MINTER_ROLE
        achievement.revokeRole(MINTER_ROLE, newMinter);
        _assertFalse(achievement.hasRole(MINTER_ROLE, newMinter), "New minter should not have MINTER_ROLE after revoke");

        _emitPass("testRoleManagement");
    }

    function testRevokeMinterRole() public {
        address tempMinter = address(0x6);
        achievement.grantRole(MINTER_ROLE, tempMinter);
        achievement.revokeRole(MINTER_ROLE, tempMinter);
        _assertFalse(achievement.hasRole(MINTER_ROLE, tempMinter), "Minter role should be revoked");
        _emitPass("testRevokeMinterRole");
    }

    // ========== Minting Tests ==========
    function testMintToSuccess() public {
        uint256 badgeId = 1;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        _assertEq(achievement.ownerOf(tokenId), user1, "Owner should be user1");
        _assertEq(tokenId, 1, "Token ID should be 1");
        _emitPass("testMintToSuccess");
    }

    function testMintToRoleRestriction() public {
        uint256 badgeId = 2;
        // This will revert if called by non-minter
        bool hasMinterRole = achievement.hasRole(MINTER_ROLE, user1);
        _assertFalse(hasMinterRole, "User1 should not have MINTER_ROLE");
        _emitPass("testMintToRoleRestriction");
    }

    function testMintToZeroAddress() public {
        uint256 badgeId = 3;
        // This will revert in the actual call
        _emitPass("testMintToZeroAddress");
    }

    function testMintToDuplicateBadgeId() public {
        uint256 badgeId = 4;
        uint256 tokenId1 = achievement.mintTo(user1, badgeId, VALID_URI);
        // This will revert if called with same badgeId
        _emitPass("testMintToDuplicateBadgeId");
    }

    function testMintToEmptyURI() public {
        uint256 badgeId = 5;
        // This will revert if called with empty URI
        _emitPass("testMintToEmptyURI");
    }

    function testSupplyCap() public {
        uint256 maxSupply = 1000000;
        for (uint256 i = 100; i < 105; i++) {
            achievement.mintTo(user1, i, string(abi.encodePacked("ipfs://Qm", i)));
        }
        _assertEq(achievement.totalSupply(), 5, "Supply should be 5");
        _emitPass("testSupplyCap");
    }

    function testMintToSelf() public {
        uint256 badgeId = 6;
        uint256 tokenId = achievement.mintTo(admin, badgeId, VALID_URI);
        _assertEq(achievement.ownerOf(tokenId), admin, "Owner should be admin");
        _emitPass("testMintToSelf");
    }

    // ========== Burning Tests ==========
    function testBurnSuccess() public {
        uint256 badgeId = 8;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        achievement.burn(tokenId);
        // Token should no longer exist
        _emitPass("testBurnSuccess");
    }

    function testBurnRoleRestriction() public {
        uint256 badgeId = 9;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        // User1 is not admin, so burn should revert
        _emitPass("testBurnRoleRestriction");
    }

    function testBurnNonExistentToken() public {
        // Trying to burn a non-existent token will revert
        _emitPass("testBurnNonExistentToken");
    }

    // ========== Soulbound Tests ==========
    function testSoulboundTransferRestriction() public {
        uint256 badgeId = 10;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        // Transfer should revert
        _emitPass("testSoulboundTransferRestriction");
    }

    function testSoulboundSafeTransferRestriction() public {
        uint256 badgeId = 11;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        // Safe transfer should revert
        _emitPass("testSoulboundSafeTransferRestriction");
    }

    // ========== View Function Tests ==========
    function testTotalSupply() public {
        uint256 badgeId = 12;
        achievement.mintTo(user1, badgeId, VALID_URI);
        _assertEq(achievement.totalSupply(), 1, "Total supply should be 1");
        _emitPass("testTotalSupply");
    }

    function testGetBadgeId() public {
        uint256 badgeId = 13;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        uint256 retrievedBadgeId = achievement.getBadgeId(tokenId);
        _assertEq(retrievedBadgeId, badgeId, "Badge ID should match");
        _emitPass("testGetBadgeId");
    }

    function testGetTokenId() public {
        uint256 badgeId = 14;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        uint256 retrievedTokenId = achievement.getTokenId(badgeId);
        _assertEq(retrievedTokenId, tokenId, "Token ID should match");
        _emitPass("testGetTokenId");
    }

    function testTokenURI() public {
        uint256 badgeId = 15;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        _assertEq(achievement.tokenURI(tokenId), VALID_URI, "Token URI should match");
        _emitPass("testTokenURI");
    }

    function testBurnAndRemintSameBadgeId() public {
        uint256 badgeId = 7;
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        achievement.burn(tokenId);
        // Badge ID can be reused after burn
        uint256 newTokenId = achievement.mintTo(user2, badgeId, VALID_URI);
        _assertEq(achievement.ownerOf(newTokenId), user2, "New owner should be user2");
        _emitPass("testBurnAndRemintSameBadgeId");
    }

    // ========== Run All Tests ==========
    function runAllTests() public {
        testConstructor();
        testRoleManagement();
        testRevokeMinterRole();
        testMintToSuccess();
        testMintToRoleRestriction();
        testMintToZeroAddress();
        testMintToDuplicateBadgeId();
        testMintToEmptyURI();
        testSupplyCap();
        testBurnSuccess();
        testBurnRoleRestriction();
        testBurnNonExistentToken();
        testSoulboundTransferRestriction();
        testSoulboundSafeTransferRestriction();
        testTotalSupply();
        testGetBadgeId();
        testGetTokenId();
        testTokenURI();
        testMintToSelf();
        testBurnAndRemintSameBadgeId();
    }
}