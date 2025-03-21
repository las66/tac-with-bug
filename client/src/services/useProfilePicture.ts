import { reactive } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { isLoggedIn } from './useUser'

interface ProfileStateType {
  profilePics: { [key: string]: string | undefined }
}

const profileState = reactive<ProfileStateType>({
  profilePics: {},
})

export function setProfilePic(username: string, profilePic: string | undefined): void {
  profileState.profilePics[username] = profilePic
}

export function getProfilePicSrc(username: string): string | undefined {
  if (!isLoggedIn.value) {
    deleteProfilePics()
    return undefined
  }
  return profileState.profilePics[username] ? profileState.profilePics[username] : undefined
}

export function deleteProfilePic(username: string): void {
  delete profileState.profilePics[username] // eslint-disable-line
}

export function deleteProfilePics(): void {
  profileState.profilePics = {}
}

export async function requestProfilePic(username: string): Promise<void> {
  if (!isLoggedIn.value) {
    deleteProfilePics()
    return
  }

  if (!(username in profileState.profilePics)) {
    setProfilePic(username, undefined)
    const picture = await Service.getProfilePicture(username)
    if (picture !== '') {
      setProfilePic(username, picture.substring(1, picture.length - 1))
    }
  }
}
