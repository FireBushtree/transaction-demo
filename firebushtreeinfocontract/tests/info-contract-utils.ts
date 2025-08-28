import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { MessageChanged } from "../generated/InfoContract/InfoContract"

export function createMessageChangedEvent(
  sender: Address,
  oldMessage: string,
  newMessage: string
): MessageChanged {
  let messageChangedEvent = changetype<MessageChanged>(newMockEvent())

  messageChangedEvent.parameters = new Array()

  messageChangedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  messageChangedEvent.parameters.push(
    new ethereum.EventParam("oldMessage", ethereum.Value.fromString(oldMessage))
  )
  messageChangedEvent.parameters.push(
    new ethereum.EventParam("newMessage", ethereum.Value.fromString(newMessage))
  )

  return messageChangedEvent
}
