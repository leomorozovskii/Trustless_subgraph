import {
    OfferCancelled as OfferCancelledEvent,
    OfferCreated as OfferCreatedEvent,
    OfferTaken as OfferTakenEvent,
} from '../generated/TrustlessOTC/TrustlessOTC';
import { TradeOffer, Token } from '../generated/schema';
import {
    BigInt,
    Bytes,
    BigDecimal,
    Address,
    ethereum,
} from '@graphprotocol/graph-ts';
import {
    fetchOfferDetails,
    fetchTokenDecimals,
    fetchTokenName,
    fetchTokenSymbol,
    fetchUserTradesAndValidateTaker,
} from './helpers';

export const ADDRESS_ZERO = Bytes.fromHexString(
    '0x0000000000000000000000000000000000000000',
);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString('0');
export const TRANSFER_TOPIC =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export function handleOfferCreated(event: OfferCreatedEvent): void {
    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer == null) {
        tradeOffer = new TradeOffer(event.params.tradeID.toString());
        const offerDetails = fetchOfferDetails(
            event.address,
            event.params.tradeID,
        ).value;

        tradeOffer.tokenFrom = offerDetails.get_tokenFrom();
        tradeOffer.tokenTo = offerDetails.get_tokenTo();
        tradeOffer.amountFrom = offerDetails.get_amountFrom().toBigDecimal();
        tradeOffer.amountTo = offerDetails.get_amountTo().toBigDecimal();
        tradeOffer.amountFromWithFee = offerDetails
            .get_amountFrom()
            .minus(offerDetails.get_fee())
            .toBigDecimal();

        tradeOffer.feeAmount = offerDetails.get_fee();
        tradeOffer.creator = offerDetails.get_creator();
        tradeOffer.txFrom = event.transaction.from;
        tradeOffer.taker = ADDRESS_ZERO;
        tradeOffer.active = true;
        tradeOffer.completed = false;
        tradeOffer.tradeID = event.params.tradeID;
        tradeOffer.optionalTaker = ADDRESS_ZERO;
        tradeOffer.blockNumber = event.block.number;
        tradeOffer.creationTimestamp = event.block.timestamp;
        tradeOffer.creationHash = event.transaction.hash;

        tradeOffer.save();

        // Get info about tokenFrom
        let tokenFrom = Token.load(tradeOffer.tokenFrom as Bytes);

        // fetch info if null
        if (tokenFrom === null) {
            tokenFrom = new Token(tradeOffer.tokenFrom as Bytes);
            const tokenFromAddress = Address.fromBytes(
                tradeOffer.tokenFrom as Bytes,
            );

            tokenFrom.symbol = fetchTokenSymbol(tokenFromAddress);
            tokenFrom.name = fetchTokenName(tokenFromAddress);
            tokenFrom.decimals = fetchTokenDecimals(tokenFromAddress);
            tokenFrom.save();
        }

        // Get info about tokenTo
        let tokenTo = Token.load(tradeOffer.tokenTo as Bytes);

        // fetch info if null
        if (tokenTo === null) {
            tokenTo = new Token(tradeOffer.tokenTo as Bytes);
            const tokenToAddress = Address.fromBytes(
                tradeOffer.tokenTo as Bytes,
            );

            tokenTo.symbol = fetchTokenSymbol(tokenToAddress);
            tokenTo.name = fetchTokenName(tokenToAddress);
            tokenTo.decimals = fetchTokenDecimals(tokenToAddress);
            tokenTo.save();
        }
    }
}

export function handleOfferCancelled(event: OfferCancelledEvent): void {
    const tradeOffer = TradeOffer.load(event.params.tradeID.toString());

    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.cancelTimestamp = event.block.timestamp;
        tradeOffer.cancelHash = event.transaction.hash;
        tradeOffer.save();
    }
}

export function handleOfferTaken(event: OfferTakenEvent): void {
    const tradeOffer = TradeOffer.load(event.params.tradeID.toString());

    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.completed = true;
        tradeOffer.takenTimestamp = event.block.timestamp;
        tradeOffer.takenHash = event.transaction.hash;
        tradeOffer.save();
    }

    const txReceipt: ethereum.TransactionReceipt | null = event.receipt;

    if (txReceipt != null) {
        for (let i = 0; i < txReceipt.logs.length; i++) {
            const log = txReceipt.logs[i];

            if (log.topics[0].toHexString() == TRANSFER_TOPIC && tradeOffer) {
                const correctFromAddressFormat = log.topics[1]
                    .toHexString()
                    .substr(26, 40);
                const fromAddress = Address.fromString(
                    correctFromAddressFormat,
                );

                const correctToAddressFormat = log.topics[2]
                    .toHexString()
                    .substr(26, 40);

                const toAddress: Address = Address.fromString(
                    correctToAddressFormat,
                );
                const creator: Address = Address.fromBytes(tradeOffer.creator);

                if (creator == toAddress && fromAddress != event.address) {
                    const isTaker = fetchUserTradesAndValidateTaker(
                        event.address,
                        fromAddress,
                        event.params.tradeID,
                    );

                    tradeOffer.taker = isTaker ? fromAddress : ADDRESS_ZERO;
                    tradeOffer.save();
                }
            }
        }
    }
}
