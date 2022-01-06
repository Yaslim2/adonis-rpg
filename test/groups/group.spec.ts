import User from 'App/Models/User'
import { GroupFactory, UserFactory } from 'Database/factories'
import Database from '@ioc:Adonis/Lucid/Database'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
let token: string = ''
let user = {} as User

test.group('Groups', (group) => {
  test('it should create a group', async (assert) => {
    const groupPayload = {
      name: 'D&D',
      description: 'A table for D&D',
      schedule: 'periodical',
      location: 'Kaer Morhen',
      chronic: 'The Witcher',
      master: user.id,
    }
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send(groupPayload)
      .expect(201)

    assert.exists(body.group, 'Group undefined')
    assert.equal(body.group.name, groupPayload.name)
    assert.equal(body.group.description, groupPayload.description)
    assert.equal(body.group.schedule, groupPayload.schedule)
    assert.equal(body.group.location, groupPayload.location)
    assert.equal(body.group.chronic, groupPayload.chronic)
    assert.equal(body.group.master, groupPayload.master)

    assert.exists(body.group.players, 'Players undefined')
    assert.equal(body.group.players.length, 1)
    assert.equal(body.group.players[0].id, groupPayload.master)
  })

  test('it should get a group by id', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const { body } = await supertest(BASE_URL)
      .get(`/groups/${group.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200)

    assert.exists(body.group, 'Group undefined')
    assert.equal(body.group.id, group.id)
    assert.equal(body.group.master, master.id)
  })

  test('it should return 401 when try to get a group without been logged', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const { body } = await supertest(BASE_URL).get(`/groups/${group.id}`).send().expect(401)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 401)
    assert.include(body.message, 'Unauthorized')
  })

  test('it should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  group.before(async () => {
    const plainPassword = '1234'
    const newUser = await UserFactory.merge({ password: plainPassword }).create()
    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email: newUser.email, password: plainPassword })
      .expect(201)

    token = body.token.token
    user = newUser
  })

  group.after(async () => {
    await supertest(BASE_URL).delete('/sessions').set('Authorization', `Bearer ${token}`)
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
