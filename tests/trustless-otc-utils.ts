import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  OfferCancelled,
  OfferCreated,
  OfferTaken,
  OwnershipTransferred
} from "../generated/TrustlessOTC/TrustlessOTC"

export function createOfferCancelledEvent(tradeID: BigInt): OfferCancelled {
  let offerCancelledEvent = changetype<OfferCancelled>(newMockEvent())

  offerCancelledEvent.parameters = new Array()

  offerCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "tradeID",
      ethereum.Value.fromUnsignedBigInt(tradeID)
    )
  )

  return offerCancelledEvent
}

export function createOfferCreatedEvent(tradeID: BigInt): OfferCreated {
  let offerCreatedEvent = changetype<OfferCreated>(newMockEvent())

  offerCreatedEvent.parameters = new Array()

  offerCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tradeID",
      ethereum.Value.fromUnsignedBigInt(tradeID)
    )
  )

  return offerCreatedEvent
}

export function createOfferTakenEvent(tradeID: BigInt): OfferTaken {
  let offerTakenEvent = changetype<OfferTaken>(newMockEvent())

  offerTakenEvent.parameters = new Array()

  offerTakenEvent.parameters.push(
    new ethereum.EventParam(
      "tradeID",
      ethereum.Value.fromUnsignedBigInt(tradeID)
    )
  )

  return offerTakenEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}
