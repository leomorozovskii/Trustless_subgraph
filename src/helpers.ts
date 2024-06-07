import { ERC20 } from '../generated/TrustlessOTC/ERC20';
import { BigInt, Address } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';
import { TrustlessOTC } from '../generated/TrustlessOTC/TrustlessOTC';

// Some precompile contracts return a value,
// so the subgraph does not recognize the error when the function is called
let PRECOMPILES: string[] = [
    '0x0000000000000000000000000000000000000002', // sha256
    '0x0000000000000000000000000000000000000003', // ripemd
    '0x0000000000000000000000000000000000000004', // identity
    '0x0000000000000000000000000000000000000005',
    '0x0000000000000000000000000000000000000006',
    '0x0000000000000000000000000000000000000009',
    '0x000000000000000000000000000000000000000a',
];

function isPrecompiles(tokenAddress: Address): boolean {
    for (let i = 0; i < PRECOMPILES.length; ++i) {
        if (tokenAddress.toHexString() == PRECOMPILES[i]) {
            return true;
        }
    }
    return false;
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);

    let symbolValue = 'UNKNOWN';

    if (isPrecompiles(tokenAddress)) {
        log.warning(
            'Failed to fetch symbol for precompile contract at address: {}',
            [tokenAddress.toHex()],
        );

        return symbolValue;
    }

    let symbolResult = contract.try_symbol();
    if (symbolResult.reverted) {
        log.warning('Failed to fetch symbol for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        symbolValue = symbolResult.value;
    }
    return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);

    let name = 'UNKNOWN';

    if (isPrecompiles(tokenAddress)) {
        log.warning(
            'Failed to fetch name for precompile contract at address: {}',
            [tokenAddress.toHex()],
        );

        return name;
    }

    let nameResult = contract.try_name();
    if (nameResult.reverted) {
        log.warning('Failed to fetch name for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        name = nameResult.value;
    }

    return name;
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress);

    let decimalValue = BigInt.fromString('0');

    if (isPrecompiles(tokenAddress)) {
        log.warning(
            'Failed to fetch decimals for precompile contract at address: {}',
            [tokenAddress.toHex()],
        );

        return decimalValue;
    }

    let decimalResult = contract.try_decimals();
    if (decimalResult.reverted) {
        log.warning('Failed to fetch decimals for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        decimalValue = BigInt.fromI32(decimalResult.value);
    }

    return decimalValue;
}

export function fetchFeeBasisPoints(tokenAddress: Address): BigInt {
    let contract = TrustlessOTC.bind(tokenAddress);

    let fee = BigInt.fromString('0');

    let feeResult = contract.try_feeBasisPoints();
    if (feeResult.reverted) {
        log.warning('Failed to fetch fee for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        fee = feeResult.value;
    }

    return fee;
}
