import { HTTPListener } from 'transporter-node'
import { Customer, User, Mentor, Question, Chat } from 'hindsight-core'
import S3 from 'hindsight-core/lib/services/s3'
import './socket.js'

const result = new HTTPListener()

async function auth(msg, context) {
	const { session } = msg.meta
	if (!session)
		throw new Error('Session field is missing')
	context.me = await User.fromSession(session)
	if (!context.me)
		throw new Error('Invalid session')

}

result.on('file.upload', async msg => {
	return S3(msg.payload.name, msg.payload.type, msg.payload.data)
})

result.on('user.register', async msg => {
	const { first, last, email, password, refcode, end, degree} = msg.payload
	const user = await User.create(first, last, email, password, refcode, end, degree)
	const session = await User.login(email, password)
	return {
		user,
		session
	}

})

result.on('user.login', msg => {
	const { email, password } = msg.payload
	return User.login(email, password)
})

result.on('user.password', auth, (msg, context) => {
	const { password } = msg.payload
	return User.password(context.me.key, password)
})

result.on('user.me', auth, (msg, context) => {
	return context.me
})

result.on('user.update', auth, (msg, context) => {
	return User.update(context.me.key, msg.payload)
})

result.on('mentor.upgrade', auth, async (msg, context) => {
	await Mentor.upgrade(context.me.key, msg.payload.email)
    return {
        success: true,
    }
})

result.on('mentor.confirm', auth, async (msg, context) => {
    return await Mentor.confirm(context.me.key, msg.payload.token)
})

result.on('mentor.get', auth, msg => {
	return Mentor.fromKey(msg.payload.key)
})

result.on('mentor.event.add', auth, (msg, context) => {
	const { entity, info, kind } = msg.payload
	if (['school', 'employer', 'exam', 'activity'].indexOf(kind) === -1)
		throw new Error(`Invalid kind: ${kind}`)
	return Mentor[kind](context.me.key, entity, info)
})

result.on('mentor.event.delete', auth, async (msg, context) => {
	await Mentor.deleteEvent(context.me.key, msg.payload.event)
	return {
		success: true
	}
})

result.on('mentor.image', auth, async (msg, context) => {
    return await Mentor.image(context.me.key, msg.payload.link)
})

result.on('mentor.profile', auth, async (msg, context) => {
	return Mentor.profile(context.me.key, msg.payload)
})

result.on('mentor.search', async(msg) => {
	return Mentor.search(msg.payload)
})

result.on('mentor.schools', async () => {
	return Mentor.schools()
})

result.on('mentor.calculaterep', async(msg, context) => {
    return Mentor.calculateRep(msg.payload)
})

result.on('question.ask', auth, (msg, context) => {
	const { title, body, tags } = msg.payload
	return Question.ask(context.me.key, title, body, ...tags)
})

result.on('question.respond', auth, (msg, context) => {
	const { question, response } = msg.payload
	return Question.respond(context.me.key, question, response)
})

result.on('question.view', auth, async (msg, context) => {
	const { question } = msg.payload
	await Question.view(context.me.key, question)
	return {
		success: true
	}
})

result.on('question.search', msg => {
	const { category, size, tagquery } = msg.payload
	return Question.search(category, size, tagquery)
})

result.on('question.get', msg => {
	const { question } = msg.payload
	return Question.fromKey(question)
})

result.on('question.tags', msg => {
	const { question } = msg.payload
	 return Question.getTags(question)
})

result.on('question.answers', msg => {
	const { question } = msg.payload
	return Question.answers(question)
})

result.on('chat.create', auth, (msg, context) => {
	return Chat.create(context.me.key, msg.payload.users[0])
})

result.on('chat.get', auth, (msg, context) => {
	return Chat.get(context.me.key, msg.payload.key)
})

result.on('chat.event', auth, async (msg, context) => {
	if (msg.payload.kind === 'request')
		return Chat.request(context.me.key, msg.payload.chat, msg.payload.body)

	if (msg.payload.kind === 'accept')
		await Chat.accept(context.me.key, msg.payload.body.target)

	if (msg.payload.kind === 'cancel')
		await Chat.cancel(context.me.key, msg.payload.body.target)

	return Chat.send(context.me.key, msg.payload.chat, msg.payload.kind, msg.payload.body)
})

result.on('chat.all', auth, (msg, context) => {
	return Chat.all(context.me.key)
})

result.on('chat.pay', auth, async (msg, context) => {
	await Customer.pay(context.me.key, msg.payload.chat, msg.payload.requests)
	return {
		success: true,
	}
})

result.on('customer.create', auth, async (msg, context) => {
	await Customer.create(context.me.key, msg.payload.token)
	return {
		success: true,
	}
})


result.start()
