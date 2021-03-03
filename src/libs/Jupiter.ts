export function getConfigOptions({
  jupiterServer,
  fundedAddress,
  fundedAddressPassphrase,
  encryptSecret,
  fndrAddress,
  fndrSecretPhrase,
  newSecretPhrase,
  fndrPublicKey,
  fndrAccount,
}: IStringMap) {
  return [
    {
      name: 'jupiterServer',
      label: 'Jupiter Blockchain Server',
      description: `The Jupiter blockchain server URL.`,
      type: 'text',
      default: jupiterServer || 'https://jpr.gojupiter.tech',
    },
    {
      name: 'fundedAddress',
      label: 'Funded Address',
      description: `The funded 'JUP-XXX' address that we'll use to fund (w/ a VERY tiny amount: 0.01 JUP) another account to add encrypted account information to the Jupiter blockchain.`,
      type: 'text',
      default: fundedAddress || '',
    },
    {
      name: 'fundedAddressPassphrase',
      label: 'Funded Address Passphrase',
      description: `The funded 'JUP-XXX' address passphrase. This is needed to allow funding your fndr address that stores your accounts.`,
      type: 'password',
      default: fundedAddressPassphrase || '',
    },
    {
      name: 'encryptSecret',
      label: 'Encryption Secret',
      description: `The encryption secret (any alphanumeric characters you'd like) that will be used to encrypt record information before we send it to the blockchain.`,
      type: 'password',
      default: encryptSecret || '',
    },
    // {
    //   name: 'allowAccountAddressCreation',
    //   label: `Can we fund a new 'JUP-XXX' account with a tiny amount of $JUP to use to execute transactions to store your account information on the blockchain?`,
    //   type: 'radio',
    //   choices: [{ label: 'Yes' }, { label: 'No' }],
    // },
    {
      type: 'header',
      label: `fndr Account`,
      description: `The following was just generated and will be funded with a very small amount of $JUP to support storing account information in transactions from this account. You can override this with another account if you'd like.`,
    },
    {
      name: 'fndrAddress',
      label: 'fndr Account Storage Address',
      description: `The address to be used to store your encrypted account information (we generated this just now).`,
      type: 'text',
      default: fndrAddress,
    },
    {
      name: 'fndrSecretPhrase',
      label: 'fndr Account Passphrase',
      description: `The passphrase for the above account.`,
      type: 'password',
      default: fndrSecretPhrase || newSecretPhrase,
    },
    {
      name: 'fndrPublicKey',
      label: 'fndr Account Public Key',
      description: `The public key for the above account.`,
      type: 'text',
      default: fndrPublicKey,
    },
    {
      name: 'fndrAccount',
      label: 'fndr Account ID',
      description: `The account ID for the above address.`,
      type: 'password',
      default: fndrAccount,
    },
  ]
}