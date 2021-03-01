import { Request, Response } from 'express'
import config from '../config'
import { getJwtToken } from '../libs/Jwt'

export default {
  verb: 'post',
  path: '/config',
  formidable: false,

  async handler(req: Request, res: Response) {
    try {
      const jupiterConfig = req.body

      const hasAllRequired =
        jupiterConfig.jupiterServer &&
        jupiterConfig.fundedAddress &&
        jupiterConfig.fundedAddressPassphrase &&
        jupiterConfig.fndrAddress &&
        jupiterConfig.fndrSecretPhrase &&
        jupiterConfig.fndrPublicKey &&
        jupiterConfig.fndrAccount
      if (!hasAllRequired) return res.redirect('/?error=fields')

      res.cookie(
        config.server.sessionCookieKey,
        getJwtToken({
          ...jupiterConfig,
          encryptSecret:
            jupiterConfig.encryptSecret ||
            jupiterConfig.fundedAddressPassphrase,
        }),
        {
          httpOnly: true,
          secure: config.server.isProduction,
        }
      )

      res.redirect('/')
    } catch (err) {
      res.redirect('/')
    }
  },
}
