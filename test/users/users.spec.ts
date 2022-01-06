import User from 'App/Models/User'
import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

let user = {} as User
let token: string = ''

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
test.group('User', (group) => {
  test('it should create an user', async (assert) => {
    const userPayload = {
      email: 'teste@teste.com',
      username: 'teste',
      password: 'teste',
    }
    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(201)
    assert.exists(body.user, 'User undefined')
    assert.exists(body.user.id, 'Id undefined')
    assert.equal(body.user.email, userPayload.email)
    assert.equal(body.user.username, userPayload.username)
    assert.notExists(body.user.password, 'Password defined')
  })

  test('it should be able to get user data by id', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .get(`/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200)

    assert.exists(body.user, 'User undefined')
    assert.equal(body.user.id, user.id)
  })

  test('it should return 404 when try to get an user data with an invalid id', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .get(`/users/aaaa`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(404)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
    assert.include(body.message, 'resource')
  })

  test('it should return 401 when try to get an user data without been logged', async (assert) => {
    const { body } = await supertest(BASE_URL).get(`/users/${user.id}`).send().expect(401)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 401)
    assert.include(body.message, 'Unauthorized')
  })

  test('it should return 403 when try to get an user data without be him logged', async (assert) => {
    const { id } = await UserFactory.create()
    const { body } = await supertest(BASE_URL)
      .get(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(403)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 403)
    assert.include(body.message, 'authorized')
  })

  test('it should return 409 when email is already in use', async (assert) => {
    const { email } = await UserFactory.create()
    const { body } = await supertest(BASE_URL)
      .post('/users')
      .send({
        email,
        username: 'teste',
        password: 'teste',
      })
      .expect(409)

    assert.exists(body.message)
    assert.exists(body.code)
    assert.exists(body.status)
    assert.include(body.message, 'Email')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 409)
  })

  test('it should return 409 when username is already in use', async (assert) => {
    const { username } = await UserFactory.create()
    const { body } = await supertest(BASE_URL)
      .post('/users')
      .send({
        username,
        email: 'teste@teste.com',
        password: 'teste',
      })
      .expect(409)

    assert.exists(body.message)
    assert.exists(body.code)
    assert.exists(body.status)
    assert.include(body.message, 'Username')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 409)
  })

  test('it should return 422 when required data are not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/users').send({}).expect(422)
    assert.exists(body.code)
    assert.exists(body.status)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 422 when email are not valid', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/users')
      .send({ email: 'teste', password: '123456', username: 'yaslim' })
      .expect(422)
    assert.exists(body.code)
    assert.exists(body.status)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 422 when password are not valid', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/users')
      .send({ email: 'teste@teste.com', password: '123', username: 'yaslim' })
      .expect(422)
    assert.exists(body.code)
    assert.exists(body.status)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should update an user', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .put(`/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: user.email,
        password: user.password,
        avatar: user.avatar,
      })
      .expect(200)

    assert.exists(body.user, 'User undefined')
    assert.equal(body.user.id, user.id)
    assert.equal(body.user.email, user.email)
    assert.equal(body.user.avatar, user.avatar)
  })

  test('it should update the password of the user', async (assert) => {
    const password = 'teste'
    const { body } = await supertest(BASE_URL)
      .put(`/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: user.email,
        password,
        avatar: user.avatar,
      })
      .expect(200)

    assert.exists(body.user, 'User undefined')
    assert.equal(body.user.id, user.id)

    await user.refresh()
    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('it should return 422 when required data is not provided', async (assert) => {
    const { id } = await UserFactory.create()
    const { body } = await supertest(BASE_URL)
      .put(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 422 when providing invalid email', async (assert) => {
    const { password, id } = await UserFactory.create()
    const email = 'test@'
    const { body } = await supertest(BASE_URL)
      .put(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password, email })
      .expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 422 when providing invalid password', async (assert) => {
    const { id, email } = await UserFactory.create()
    const password = '123'
    const { body } = await supertest(BASE_URL)
      .put(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password, email })
      .expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 422 when providing invalid avatar url', async (assert) => {
    const { id, email, password } = await UserFactory.create()
    const avatar = 'http:'
    const { body } = await supertest(BASE_URL)
      .put(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password, email, avatar })
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
