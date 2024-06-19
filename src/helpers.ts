import { ERC20 } from '../generated/TrustlessOTC/ERC20';
import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';
import {
    TrustlessOTC,
    TrustlessOTC__getOfferDetailsResult,
} from '../generated/TrustlessOTC/TrustlessOTC';

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

function isPrecompiles(contractAddress: Address): boolean {
    for (let i = 0; i < PRECOMPILES.length; ++i) {
        if (contractAddress.toHexString() == PRECOMPILES[i]) {
            return true;
        }
    }
    return false;
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    const contract = ERC20.bind(tokenAddress);

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
    const contract = ERC20.bind(tokenAddress);

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
    const contract = ERC20.bind(tokenAddress);

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

export function fetchOfferDetails(
    contractAddress: Address,
    tradeID: BigInt,
): ethereum.CallResult<TrustlessOTC__getOfferDetailsResult> {
    const contract = TrustlessOTC.bind(contractAddress);

    let offerDetails =
        new ethereum.CallResult<TrustlessOTC__getOfferDetailsResult>();

    offerDetails = contract.try_getOfferDetails(tradeID);
    if (offerDetails.reverted) {
        log.warning(
            'Failed to fetch offer details for contract at address: {}',
            [contractAddress.toHex()],
        );
    } else {
        offerDetails = offerDetails;
    }

    return offerDetails;
}

export function fetchUserTradesAndValidateTaker(
    contractAddress: Address,
    user: Address,
    tradeID: BigInt,
): bool {
    const contract = TrustlessOTC.bind(contractAddress);

    let tradeIds = new ethereum.CallResult<Array<BigInt>>();

    tradeIds = contract.try_getUserTrades(user);
    if (tradeIds.reverted) {
        log.warning('Failed to fetch user trades for contract at address: {}', [
            contractAddress.toHex(),
        ]);
    } else {
        tradeIds = tradeIds;
    }

    const isTaker = tradeIds.value.includes(tradeID);
    return isTaker;
}
