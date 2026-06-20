// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Minimal ds-test shim: only declares the logging events and fail() used
// by forge-std/Test.sol. Do not implement assertion helpers here, as
// forge-std provides its own implementations which must not conflict.
abstract contract DSTest {
    event log(string);
    event log_named_uint(string indexed key, uint256 val);
    event log_named_int(string indexed key, int256 val);
    event log_named_address(string indexed key, address val);
    event log_named_bytes(string indexed key, bytes val);
    event log_named_string(string indexed key, string val);
    event log_named_decimal_uint(string indexed key, uint256 val, uint256 decimals);

    function fail() internal virtual {
        revert("ds-test fail");
    }
}
