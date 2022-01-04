import { DateTime, Duration } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import Mail from '@ioc:Adonis/Addons/Mail'
import { UserFactory } from './../../database/factories/index'
import Database from '@ioc:Adonis/Lucid/Database'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Password', (group) => {
  test('it should send an email with forgot password instructions', async (assert) => {
    const { email, username } = await UserFactory.create()
    Mail.trap((message) => {
      assert.deepEqual(message.to, [{ address: email }])
      assert.deepEqual(message.from, { address: 'no-reply@rpg.com' })
      assert.include(message.html!, username)
      assert.equal(message.subject, 'RPG - Recuperação de senha')
    })
    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email,
        resetPasswordUrl: 'http://rpg.com/',
      })
      .expect(204)

    Mail.restore()
  })

  test('it should create a reset password token', async (assert) => {
    const user = await UserFactory.create()
    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: 'http://rpg.com/',
      })
      .expect(204)

    const tokens = await user.related('tokens').query()
    assert.isNotEmpty(tokens)
  })

  test('it should return 422 when required data is not provided or data is invalid (forgot password)', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/forgot-password').send({}).expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should be able to reset the password', async (assert) => {
    const user = await UserFactory.create()
    const password = '123456'
    const { token } = await user.related('tokens').create({ token: 'token' })
    await supertest(BASE_URL).post('/reset-password').send({ token, password }).expect(204)

    await user.refresh()
    const checkPassword = await Hash.verify(user.password, password)
    assert.isTrue(checkPassword)
  })

  test('it should return 422 when required data is not provided or data is invalid (reset password)', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/reset-password').send({}).expect(422)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 404 when using the same token twice', async (assert) => {
    const user = await UserFactory.create()
    const password = '123456'
    const { token } = await user.related('tokens').create({ token: 'token' })
    await supertest(BASE_URL).post('/reset-password').send({ token, password }).expect(204)

    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token, password })
      .expect(404)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, '404')
  })

  test('it cannot reset the password when token is expired after 2 hours', async (assert) => {
    const user = await UserFactory.create()
    const password = '123456'
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })
    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token, password })
      .expect(410)

    assert.equal(body.code, 'TOKEN_EXPIRED')
    assert.equal(body.status, '410')
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
