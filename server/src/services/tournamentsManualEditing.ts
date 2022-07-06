import { err, Result, ok } from 'neverthrow'
import pg from 'pg'
import * as tTournament from '../sharedTypes/typesTournament'
import { createTournamentDataKO, createTournamentDataKOError } from './tournamentKO'

import { getPublicTournamentByID, getTournamentByIDError } from './tournamentsPublic'

export type createTournamentError = 'ONLY_KO_TOURNAMENT_IMPLEMENTED' | 'KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH' | getTournamentByIDError | createTournamentDataKOError
export async function createTournament(
  sqlClient: pg.Pool,
  title: string,
  begin: string,
  deadline: string,
  creationDates: string[],
  secondsPerGame: number,
  nTeams: number,
  playersPerTeam: 2 | 3,
  teamsPerMatch: 2 | 3,
  tournamentType: 'KO'
): Promise<Result<tTournament.publicTournament, createTournamentError>> {
  let data: tTournament.tournamentDataKO
  if (tournamentType === 'KO') {
    const dataRes = createTournamentDataKO(nTeams, teamsPerMatch)
    if (dataRes.isErr()) {
      return err(dataRes.error)
    }
    if (creationDates.length !== dataRes.value.brackets.length) {
      return err('ONLY_KO_TOURNAMENT_IMPLEMENTED')
    }
    data = dataRes.value
  } else {
    return err('KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH')
  }

  const dbRes = await sqlClient.query(
    `INSERT INTO tournaments (title, status, signup_begin, signup_deadline, creation_dates, time_per_game, n_teams, players_per_team, tournament_type, data, teams_per_match)
        VALUES ($1, 'signUpWaiting', $2, $3, $4, $5 * INTERVAL '1 second', $6, $7, $8, $9, $10) RETURNING *;
        `,
    [title, begin, deadline, creationDates, secondsPerGame, nTeams, playersPerTeam, tournamentType, data, teamsPerMatch]
  )
  const tournament = await getPublicTournamentByID(sqlClient, dbRes.rows[0].id)
  if (tournament.isErr()) {
    return err(tournament.error)
  }
  return ok(tournament.value)
}
