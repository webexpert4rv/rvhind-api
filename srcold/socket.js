import { Server } from 'ws'
import { Chat, User } from 'hindsight-core'
import qs from 'querystring'
const server = new Server({ port: 3002 })

server.on('connection', async ws => {
	const query = qs.parse(ws.upgradeReq.url.substring(2))
	const me = await User.fromSession(query.session)
	const close = Chat.queue(me.key, query.offset, msg => {
		ws.send(JSON.stringify(msg), () => {})
	})
	ws.on('close', close)
})
