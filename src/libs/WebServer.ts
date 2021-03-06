import http from 'http'
import path from 'path'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import express, { Request, Response, NextFunction } from 'express'
import formidable from 'express-formidable'
import bunyan from 'bunyan'
import passport from 'passport'
import passportJwt from '../passport/jwt'
import { jwtAuthMiddleware } from './Jwt'
import Redis from './Redis'
import routes, { IRouteOpts } from '../routes'
import config from '../config'

const log = bunyan.createLogger(config.logger.options as any)
const app = express()
const httpServer = new http.Server(app)

const opts: IRouteOpts = { log, redis: Redis }

app.disable('x-powered-by')

export default function WebServer(
  portToListenOn = config.server.port,
  shouldListenOnPort = true
) {
  return [
    httpServer,
    function startServer() {
      //view engine setup
      app.set('views', path.join(__dirname, '..', '..', 'views'))
      app.set('view engine', 'pug')
      app.enable('trust proxy')

      // redirect to https if production and connection is not secure
      // app.use((req: Request, res: Response, next: NextFunction) => {
      //   if (
      //     config.server.isProduction &&
      //     config.server.host.indexOf('https') === 0 &&
      //     !req.secure
      //   )
      //     return res.redirect(`${config.server.host}${req.originalUrl}`)
      //   next()
      // })

      app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))
      app.use(bodyParser.json({ limit: '10mb' }))
      app.use(cookieParser(config.server.sessionSecret))
      app.use(jwtAuthMiddleware(opts))

      const formidableMiddleware = formidable({ multiples: true })

      // static files
      app.use(
        '/public',
        express.static(path.join(__dirname, '..', '..', '/public'))
      )

      // setup route handlers in the express app
      routes.forEach(async (routeFact) => {
        const route = routeFact(opts)
        try {
          const handlerArgs = route.formidable
            ? [formidableMiddleware, route.handler]
            : [route.handler]

          const routeAry =
            route.path instanceof Array ? route.path : [route.path]
          routeAry.forEach((routePath: string) => {
            app[route.verb.toLowerCase() as 'all' | 'get' | 'post'](
              routePath,
              ...handlerArgs
            )
            log.debug(
              `Successfully bound route to express; method: ${route.verb}; path: ${route.path}`
            )
          })
        } catch (err) {
          log.error(
            err,
            `Error binding route to express; method: ${route.verb}; path: ${route.path}`
          )
        }
      })

      //passport setup
      const pjwt = passportJwt()
      passport.use('jwt', new pjwt.strategy(pjwt.options, pjwt.handler))
      passport.serializeUser((user: any, done: any) => done(null, user))
      passport.deserializeUser((user: any, done: any) => done(null, user))

      // Express error handling
      app.use(function ExpressErrorHandler(
        err: any,
        req: Request,
        res: Response,
        next: NextFunction
      ) {
        log.error('Express error handling', err)
        // res.redirect(err.redirectRoute || '/')
        res.status(500).send(`${err.name} - ${err.stack}`)
      })

      // Assume we'll listen in the primary app file via `sticky-cluster` module
      if (shouldListenOnPort) {
        httpServer.listen(portToListenOn, () =>
          log.info(`listening on *:${portToListenOn}`)
        )
      }
      return app
    },
  ]
}
