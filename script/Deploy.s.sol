// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MiniHackAchievement.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        MiniHackAchievement achievement = new MiniHackAchievement(msg.sender);
        console.log("Deployed MiniHackAchievement at:");
        console.logAddress(address(achievement));
        vm.stopBroadcast();
    }
}
