import { TacServer } from '../entrypoints/server'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

async function tournamentCleanUp(testServer: TacServer, tournamentID: number | undefined) {
  if (tournamentID == null) {
    return
  }
  await testServer.pgPool.query('UPDATE games SET private_tournament_id = NULL WHERE private_tournament_id = $1;', [tournamentID])
  await testServer.pgPool.query('DELETE FROM private_tournaments_register WHERE tournamentid = $1;', [tournamentID])
  await testServer.pgPool.query('DELETE FROM users_to_private_tournaments WHERE tournamentid = $1;', [tournamentID])
  await testServer.pgPool.query('DELETE FROM private_tournaments WHERE id = $1;', [tournamentID])
}

describe('Test Suite via Socket.io', () => {
  let tournamentID: number, gameID: number, usersWithSockets: UserWithSocket[]

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 4 })
  })

  afterAll(async () => {
    await tournamentCleanUp(testServer, tournamentID)
    await closeSockets(usersWithSockets)
  })

  test('Should create Tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:create', {
      title: 'TestTournament',
      nTeams: 2,
      playersPerTeam: 2,
      teamsPerMatch: 2,
      tournamentType: 'KO',
    })
    expect(res.data).not.toBeNull()
    if (res.data == null) {
      throw new Error('Empty Game')
    }
    tournamentID = res.data.id
  })

  test('Should add player 0 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.status).toBe(200)
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
    expect(res.data?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
    expect(res.data?.registerTeams[0].activated).toEqual([true])
  })

  test('Should not add player again', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.error).not.toBeNull()
  })

  test('Should add player 0 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[1].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
  })

  test('Should not add player 2 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.error).not.toBeNull()
  })

  test('Should remove player 1 from first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { tournamentID, usernameToRemove: usersWithSockets[1].username })
    expect(res.status).toBe(200)
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
    expect(res.data?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
    expect(res.data?.registerTeams[0].activated).toEqual([true])
  })

  test('Should add player 1 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[1].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
  })

  test('Should activate player 1', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
  })

  test('Should add player 2 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false].sort())
  })

  test('Should decline player 2', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:declineParticipation', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
  })

  test('Should add player 2 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false].sort())
  })

  test('Should add player 3 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[3].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false, false].sort())
  })

  test('Should activate player 2', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, true, false].sort())
  })

  test('Should not be able to start tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID })
    expect(res?.error).not.toBeNull()
  })

  test('Should activate player 3', async () => {
    const res = await usersWithSockets[3].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, true, true].sort())
  })

  test('Should be able to start tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.status).toBe('running')
    expect(res.data?.registerTeams).toEqual([])
    expect(res.data?.teams.length).toEqual(2)
  })

  test('Should be able to start game', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID, tournamentRound: 0, roundGame: 0 })
    expect(res.data).not.toBeNull()
    expect(res.data?.data.brackets[0][0].gameID).not.toBe(-1)
    gameID = res.data?.data.brackets[0][0].gameID ?? 0
    expect(res.data?.data.brackets[0][0].winner).toBe(-1)
  })

  test('Should abort the tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:abort', { tournamentID })
    expect(res.status).toBe(200)
    expect(res.data?.status).toBe('aborted')
    expect(res.data?.data.brackets[0][0].gameID).toBe(-1)
    expect(res.data?.data.brackets[0][0].winner).toBe(-1)

    const gameRes = await testServer.pgPool.query('SELECT * FROM games WHERE id=$1;', [gameID])
    expect(gameRes.rows[0].private_tournament_id).toBeNull()
  })
})
