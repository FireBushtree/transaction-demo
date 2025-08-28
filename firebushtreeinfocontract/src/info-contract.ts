import { MessageChanged as MessageChangedEvent } from "../generated/InfoContract/InfoContract"
import { MessageChanged } from "../generated/schema"

export function handleMessageChanged(event: MessageChangedEvent): void {
  let entity = new MessageChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.oldMessage = event.params.oldMessage
  entity.newMessage = event.params.newMessage

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
