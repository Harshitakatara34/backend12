export const getSignMessage = (address, nonce) => {
    return `Please sign this message for address ${address}:\n\n${nonce}`
  }
