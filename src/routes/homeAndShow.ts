import assert from 'assert'
import fs from 'fs'
import qs from 'querystring'
import { Request, Response } from 'express'
import { Commands, Connectors, getNewJupiterAddress } from 'fndr'
import { Redis } from 'ioredis'
import { IRouteOpts, IRoute, baselineTemplateConfig } from '.'
import { getConfigOptions } from '../libs/Jupiter'
import config from '../config'

const jupConnector = Connectors.jupiter

export default function({ log, redis }: IRouteOpts): IRoute {
  return {
    verb: 'all',
    path: ['/', '/show/:uuid'],
    formidable: true,

    async handler(req: Request & IStringMap, res: Response) {
      let selectedAccount: undefined | IStringMap
      let accounts: undefined | IStringMap[]
      let configOptions: undefined | IStringMap
      let hasUploadedConfig: undefined | boolean

      const { uuid } = req.params
      const { add: didAddAccount, error, password, query } = req.query
      const hasQueryString = Object.keys(req.query).length > 0
      const shouldShowPassword = !!password && password !== 'false'

      try {
        const configJson = JSON.stringify(req.session)

        // user has a valid JUP-XXX-XXX account in a JWT cookie
        if (req.session && req.session.jupiterServer) {
          // TODO: check fndrAccount balance and fund it, if needed

          const showCommand = Commands.find((c) => {
            const f = c(jupConnector)
            if (!f) return false
            return f.name === 'show'
          })
          assert(showCommand, 'show command was not found')

          const [filteredMatches, allAccounts] = await getAccounts(
            redis,
            req.session,
            query as string
          )
          selectedAccount = uuid
            ? await showCommand(jupConnector).execute(configJson, {
                id: uuid,
                password: shouldShowPassword,
                accountListOverride: allAccounts,
              })
            : null

          accounts = filteredMatches.map((m: IStringMap) => ({
            ...m,
            password: undefined,
          }))
        } else {
          // user has not added a valid account yet
          // User uploaded a JSON config file from `fndr` CLI
          if (req.files && req.files.file) {
            const { path: jsonPath } = req.files.file as any
            const confJson = await fs.promises.readFile(jsonPath, 'utf-8')
            let newConf
            try {
              newConf = JSON.parse(confJson)
              configOptions = getConfigOptions({
                newConf,
                server: config.jupiter.server,
              })
              hasUploadedConfig = true
            } catch (err) {
              configOptions = await defaultConfOptions()
            }
          } else {
            configOptions = await defaultConfOptions()
          }
        }

        const hasFieldError = error === 'fields'
        res.render('index', {
          didAddAccount: didAddAccount === 'true',
          accounts,
          hasFieldError,
          configOptions,
          hasUploadedConfig,
          selectedAccount: selectedAccount
            ? { ...selectedAccount, shouldShowPassword }
            : null,
          ...baselineTemplateConfig(req),
          searchQuery: query,
          queryString: hasQueryString
            ? qs.stringify(req.query as IStringMap)
            : null,
        })
      } catch (err) {
        const errText = `${err.name} - ${err.stack}`
        // res.status(500).send(errText)
        log.error(errText)
        res.render('index', {
          didAddAccount: didAddAccount === 'true',
          accounts,
          hasFieldError: false,
          configOptions,
          hasUploadedConfig,
          selectedAccount: selectedAccount
            ? { ...selectedAccount, shouldShowPassword }
            : null,
          ...baselineTemplateConfig(req),
          searchQuery: query,
          queryString: hasQueryString
            ? qs.stringify(req.query as IStringMap)
            : null,
          globalError: errText,
        })
      }
    },
  }
}

async function defaultConfOptions() {
  const {
    address,
    publicKey,
    account,
    newSecretPhrase,
  } = await getNewJupiterAddress({
    jupiterServer: config.jupiter.server,
  })
  return getConfigOptions({
    fndrAddress: address,
    fndrPublicKey: publicKey,
    fndrAccount: account,
    newSecretPhrase,
  })
}

export async function getAccounts(
  redis: Redis,
  config: IStringMap,
  query?: string
) {
  const configJson = JSON.stringify(config)
  const cacheKey = `accounts_cache_${config.fndrAddress}_${query || ''}`
  const cachedAccounts = await redis.get(cacheKey)
  if (cachedAccounts) return JSON.parse(cachedAccounts)

  const searchCommand = Commands.find((c) => {
    const f = c(jupConnector)
    if (!f) return false
    return f.name === 'search'
  })
  assert(searchCommand, 'search command was not found')
  const [filteredMatches, allAccounts] = await searchCommand(
    jupConnector
  ).execute(configJson, {
    query,
  })
  const finalAccounts = filteredMatches.map((m: IStringMap) => ({
    ...m,
    password: undefined,
  }))

  const response = [finalAccounts, allAccounts]
  await redis.set(cacheKey, JSON.stringify(response), 'EX', '45')
  return response
}
