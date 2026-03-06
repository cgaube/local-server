import { execa } from 'execa'

export const hasCommand = async (command: string) => {
  try {
    await execa('which', [command], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export const ensureBrewInstalled = async (errorMessage?: string) => {
  if (!(await hasCommand('brew'))) {
    throw new Error(errorMessage ?? 'Homebrew is required but was not found.')
  }
}

export const isBrewPackageInstalled = async (pkg: string) => {
  try {
    await execa('brew', ['list', pkg], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export const ensureBrewTap = async (tap: string) => {
  await execa('brew', ['tap', tap], { stdio: 'inherit' })
}

export const installBrewPackages = async (packages: string[]) => {
  for (const pkg of packages) {
    await execa('brew', ['install', pkg], { stdio: 'inherit' })
  }
}
