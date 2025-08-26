// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract InfoContract {
  string public message;
  event MessageChanged(address indexed sender, string oldMessage, string newMessage);

  constructor(string memory initMessage) {
    message = initMessage;
  }

  function setMessage(string memory newMessage) public {
    string memory oldMessage = message;
    message = newMessage;
    emit MessageChanged(msg.sender, oldMessage, newMessage);
  }

  function getMessage() public view returns (string memory) {
    return message;
  }
}
