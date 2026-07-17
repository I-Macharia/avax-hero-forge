// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../MiniHackAchievement.sol";

contract Participant {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function claim(MiniHackAchievement achievement, uint256 badgeId) external returns (uint256) {
        return achievement.claimBadge(badgeId);
    }

    function transfer(MiniHackAchievement achievement, address to, uint256 tokenId) external {
        achievement.transferFrom(address(this), to, tokenId);
    }
}

contract Relayer {
    function claimFor(
        MiniHackAchievement achievement,
        uint256 badgeId,
        address participant
    ) external returns (uint256) {
        return achievement.claimBadgeFor(badgeId, participant);
    }
}

contract MiniHackAchievementTest {
    MiniHackAchievement internal achievement;
    Participant internal participant;
    Relayer internal relayer;
    address internal recipient = address(0xD00D);

    string internal constant URI = "ipfs://bafy-test-metadata";

    function _assertTrue(bool condition) internal pure {
        require(condition, "assertion failed");
    }

    function _assertEq(uint256 actual, uint256 expected) internal pure {
        require(actual == expected, "uint assertion failed");
    }

    function _assertEq(address actual, address expected) internal pure {
        require(actual == expected, "address assertion failed");
    }

    function _assertEq(string memory actual, string memory expected) internal pure {
        require(keccak256(bytes(actual)) == keccak256(bytes(expected)), "string assertion failed");
    }

    function setUp() public {
        achievement = new MiniHackAchievement(address(this));
        participant = new Participant();
        relayer = new Relayer();
        achievement.grantRole(achievement.RELAYER_ROLE(), address(relayer));
    }

    function _register(uint256 badgeId, bool isSoulbound) internal {
        achievement.registerBadge(badgeId, URI, isSoulbound);
    }

    function testParticipantCanClaimAnAttestedBadge() public {
        _register(1, true);
        achievement.attestEligibility(1, address(participant));

        uint256 tokenId = participant.claim(achievement, 1);

        _assertEq(achievement.ownerOf(tokenId), address(participant));
        _assertEq(achievement.tokenURI(tokenId), URI);
        _assertTrue(!achievement.isEligible(1, address(participant)));
    }

    function testRelayerPaysButCannotRedirectAnAttestedBadge() public {
        _register(1, true);
        achievement.attestEligibility(1, address(participant));

        uint256 tokenId = relayer.claimFor(achievement, 1, address(participant));

        _assertEq(achievement.ownerOf(tokenId), address(participant));
        _assertEq(achievement.balanceOf(address(relayer)), 0);
    }

    function testClaimRequiresEligibility() public {
        _register(1, true);

        try participant.claim(achievement, 1) returns (uint256) {
            revert("claim unexpectedly succeeded");
        } catch Error(string memory reason) {
            _assertEq(reason, "Not eligible");
        }
    }

    function testQuestBadgesAreSoulbound() public {
        _register(1, true);
        achievement.attestEligibility(1, address(participant));
        uint256 tokenId = participant.claim(achievement, 1);

        try participant.transfer(achievement, recipient, tokenId) {
            revert("transfer unexpectedly succeeded");
        } catch Error(string memory reason) {
            _assertEq(reason, "Soulbound: non-transferable");
        }
    }

    function testLeaderboardBadgesCanBeTransferredByTheirOwner() public {
        _register(18, false);
        uint256 tokenId = achievement.mintTo(address(participant), 18);

        participant.transfer(achievement, recipient, tokenId);

        _assertEq(achievement.ownerOf(tokenId), recipient);
    }

    function testTierIsComputedFromCurrentHoldings() public {
        for (uint256 badgeId = 1; badgeId <= 6; badgeId++) {
            _register(badgeId, true);
            achievement.attestEligibility(badgeId, address(participant));
            participant.claim(achievement, badgeId);
        }

        _assertEq(achievement.tierOf(address(participant)), 2);
    }

    function testQuestBadgeCannotBeAttestedOrMintedTwice() public {
        _register(1, true);
        achievement.attestEligibility(1, address(participant));
        participant.claim(achievement, 1);

        try achievement.attestEligibility(1, address(participant)) {
            revert("attestation unexpectedly succeeded");
        } catch Error(string memory reason) {
            _assertEq(reason, "Badge already claimed");
        }

        try achievement.mintTo(address(participant), 1) {
            revert("mint unexpectedly succeeded");
        } catch Error(string memory reason) {
            _assertEq(reason, "Quest badges require claim");
        }
    }
}
