import {
    OfferCancelled as OfferCancelledEvent,
    OfferCreated as OfferCreatedEvent,
    OfferTaken as OfferTakenEvent,
    InitiateTradeCall as InitiateTradeCall,
} from '../generated/TrustlessOTC/TrustlessOTC';
import {
    OfferCancelled,
    OfferTaken,
    TradeOffer,
    Token,
} from '../generated/schema';
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

export function handleInitiateTrade(call: InitiateTradeCall): void {
    // Added tokens
    // create the tokens
    let tokenFrom = Token.load(call.inputs._tokenFrom);
    let tokenTo = Token.load(call.inputs._tokenTo);

    // fetch info if null
    if (tokenFrom === null) {
        tokenFrom = new Token(call.inputs._tokenFrom);

        tokenFrom.symbol = fetchTokenSymbol(call.inputs._tokenFrom);
        tokenFrom.name = fetchTokenName(call.inputs._tokenFrom);
        tokenFrom.decimals = fetchTokenDecimals(call.inputs._tokenFrom);
        tokenFrom.save();
    }

    if (tokenTo === null) {
        tokenTo = new Token(call.inputs._tokenTo);

        tokenTo.symbol = fetchTokenSymbol(call.inputs._tokenTo);
        tokenTo.name = fetchTokenName(call.inputs._tokenTo);
        tokenTo.decimals = fetchTokenDecimals(call.inputs._tokenTo);
        tokenTo.save();
    }
}

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
    }
}

export function handleOfferCancelled(event: OfferCancelledEvent): void {
    const tradeOffer = TradeOffer.load(event.params.tradeID.toString());

    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.cancelTimestamp = event.block.timestamp;
        tradeOffer.cancelHash = event.transaction.hash;
        tradeOffer.save();

        const offerCancelled = new OfferCancelled(
            tradeOffer.tradeID.toString(),
        );
        offerCancelled.tradeID = event.params.tradeID;
        offerCancelled.tradeOffer = tradeOffer.id;
        offerCancelled.creator = tradeOffer.creator;
        offerCancelled.blockNumber = event.block.number;
        offerCancelled.blockTimestamp = event.block.timestamp;
        offerCancelled.transactionHash = event.transaction.hash;
        offerCancelled.save();
    }
}

export function handleOfferTaken(event: OfferTakenEvent): void {
    const tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    let offerTaken = OfferTaken.load(event.params.tradeID.toString());

    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.completed = true;
        tradeOffer.takenTimestamp = event.block.timestamp;
        tradeOffer.takenHash = event.transaction.hash;
        tradeOffer.save();

        offerTaken = new OfferTaken(event.params.tradeID.toString());
        offerTaken.tradeID = event.params.tradeID;
        offerTaken.tradeOffer = tradeOffer.id;
        offerTaken.taker = ADDRESS_ZERO;
        offerTaken.blockNumber = event.block.number;
        offerTaken.blockTimestamp = event.block.timestamp;
        offerTaken.transactionHash = event.transaction.hash;
        offerTaken.save();
    }

    const txReceipt: ethereum.TransactionReceipt | null = event.receipt;

    if (txReceipt != null) {
        for (let i = 0; i < txReceipt.logs.length; i++) {
            const log = txReceipt.logs[i];

            if (
                log.topics[0].toHexString() == TRANSFER_TOPIC &&
                tradeOffer &&
                offerTaken
            ) {
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
                    offerTaken.taker = isTaker ? fromAddress : ADDRESS_ZERO;
                    offerTaken.save();
                }
            }
        }
    }
}
