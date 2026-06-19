// SPDX-Liscence-Identifier : MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../MiniHackAchievement.sol";

contract MiniHackAchievementTest is Test {
    MiniHackAchievement public achievement;
    
    address public admin = address(0x1);
    address public minter = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    bytes32 public constant DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    string public constant VALID_URI = "ipfs://QmValid";
    string public constant EMPTY_URI = "";
    
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 badgeId);
    event BadgeBurned(uint256 indexed tokenId, uint256 badgeId);

    function setUp() public {
        achievement = new MiniHackAchievement(admin);
        vm.prank(admin);
        achievement.grantRole(MINTER_ROLE, minter);
    }

    // ========== Constructor Tests ==========
    function testConstructor() public {
        assertEq(achievement.name(), "MiniHack Achievement", "Name mismatch");
        assertEq(achievement.symbol(), "MHACH", "Symbol mismatch");
        assertTrue(achievement.hasRole(DEFAULT_ADMIN_ROLE, admin), "Admin should have DEFAULT_ADMIN_ROLE");
        assertTrue(achievement.hasRole(MINTER_ROLE, admin), "Admin should have MINTER_ROLE");
    }

    // ========== Role Management Tests ==========
    function testRoleManagement() public {
        address newMinter = address(0x5);
        vm.prank(admin);
        achievement.grantRole(MINTER_ROLE, newMinter);
        assertTrue(achievement.hasRole(MINTER_ROLE, newMinter), "New minter should have MINTER_ROLE");

        vm.prank(admin);
        achievement.revokeRole(MINTER_ROLE, newMinter);
        assertFalse(achievement.hasRole(MINTER_ROLE, newMinter), "New minter should not have MINTER_ROLE after revoke");
    }

    function testRevokeMinterRole() public {
        address tempMinter = address(0x6);
        vm.prank(admin);
        achievement.grantRole(MINTER_ROLE, tempMinter);
        vm.prank(admin);
        achievement.revokeRole(MINTER_ROLE, tempMinter);
        assertFalse(achievement.hasRole(MINTER_ROLE, tempMinter), "Minter role should be revoked");
    }

    // ========== Minting Tests ==========
    function testMintToSuccess() public {
        uint256 badgeId = 1;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        assertEq(achievement.ownerOf(tokenId), user1, "Owner should be user1");
        assertEq(tokenId, 1, "Token ID should be 1");
    }

    function testMintToRoleRestriction() public {
        uint256 badgeId = 2;
        vm.prank(user1);
        vm.expectRevert("AccessControl: account is missing role");
        achievement.mintTo(user1, badgeId, VALID_URI);
    }

    function testMintToZeroAddress() public {
        uint256 badgeId = 3;
        vm.prank(minter);
        vm.expectRevert("Cannot mint to zero address");
        achievement.mintTo(address(0), badgeId, VALID_URI);
    }

    function testMintToDuplicateBadgeId() public {
        uint256 badgeId = 4;
        vm.prank(minter);
        achievement.mintTo(user1, badgeId, VALID_URI);
        vm.prank(minter);
        vm.expectRevert("Badge ID already used");
        achievement.mintTo(user2, badgeId, VALID_URI);
    }

    function testMintToEmptyURI() public {
        uint256 badgeId = 5;
        vm.prank(minter);
        vm.expectRevert("URI cannot be empty");
        achievement.mintTo(user1, badgeId, EMPTY_URI);
    }

    function testSupplyCap() public {
        uint256 maxSupply = 1000000;
        for (uint256 i = 100; i < 105; i++) {
            vm.prank(minter);
            achievement.mintTo(user1, i, string(abi.encodePacked("ipfs://Qm", i)));
        }
        assertEq(achievement.totalSupply(), 5, "Supply should be 5");
    }

    function testMintToSelf() public {
        uint256 badgeId = 6;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(admin, badgeId, VALID_URI);
        assertEq(achievement.ownerOf(tokenId), admin, "Owner should be admin");
    }

    function testBurnAndRemintSameBadgeId() public {
        uint256 badgeId = 7;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.prank(admin);
        achievement.burn(tokenId);
        
        // Badge ID can be reused after burn
        vm.prank(minter);
        uint256 newTokenId = achievement.mintTo(user2, badgeId, VALID_URI);
        assertEq(achievement.ownerOf(newTokenId), user2, "New owner should be user2");
    }

    // ========== Burning Tests ==========
    function testBurnSuccess() public {
        uint256 badgeId = 8;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.prank(admin);
        achievement.burn(tokenId);
        
        // Token should no longer exist
        vm.expectRevert("ERC721: invalid token ID");
        achievement.ownerOf(tokenId);
    }

    function testBurnRoleRestriction() public {
        uint256 badgeId = 9;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.prank(user1);
        vm.expectRevert("AccessControl: account is missing role");
        achievement.burn(tokenId);
    }

    function testBurnNonExistentToken() public {
        vm.prank(admin);
        vm.expectRevert("ERC721: invalid token ID");
        achievement.burn(999);
    }

    // ========== Soulbound Tests ==========
    function testSoulboundTransferRestriction() public {
        uint256 badgeId = 10;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.prank(user1);
        vm.expectRevert("Soulbound: non-transferable");
        achievement.transferFrom(user1, user2, tokenId);
    }

    function testSoulboundSafeTransferRestriction() public {
        uint256 badgeId = 11;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.prank(user1);
        vm.expectRevert("Soulbound: non-transferable");
        achievement.safeTransferFrom(user1, user2, tokenId);
    }

    // ========== View Function Tests ==========
    function testTotalSupply() public {
        uint256 badgeId = 12;
        vm.prank(minter);
        achievement.mintTo(user1, badgeId, VALID_URI);
        assertEq(achievement.totalSupply(), 1, "Total supply should be 1");
    }

    function testGetBadgeId() public {
        uint256 badgeId = 13;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        uint256 retrievedBadgeId = achievement.getBadgeId(tokenId);
        assertEq(retrievedBadgeId, badgeId, "Badge ID should match");
    }

    function testGetTokenId() public {
        uint256 badgeId = 14;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        uint256 retrievedTokenId = achievement.getTokenId(badgeId);
        assertEq(retrievedTokenId, tokenId, "Token ID should match");
    }

    function testTokenURI() public {
        uint256 badgeId = 15;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        assertEq(achievement.tokenURI(tokenId), VALID_URI, "Token URI should match");
    }

    // ========== Event Tests ==========
    function testMintToEmitsEvent() public {
        uint256 badgeId = 16;
        vm.prank(minter);
        
        vm.expectEmit(true, true, true, true);
        emit BadgeMinted(user1, 17, badgeId);
        
        vm.prank(minter);
        achievement.mintTo(user1, badgeId, VALID_URI);
    }

    function testBurnEmitsEvent() public {
        uint256 badgeId = 18;
        vm.prank(minter);
        uint256 tokenId = achievement.mintTo(user1, badgeId, VALID_URI);
        
        vm.expectEmit(true, true, true, true);
        emit BadgeBurned(tokenId, badgeId);
        
        vm.prank(admin);
        achievement.burn(tokenId);
    }
}
