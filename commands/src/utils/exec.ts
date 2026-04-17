import { execa } from 'execa'

export const execInDir = async (
  command: string,
  args: string[],
  directory: string,
) => {
  return execa(command, args, {
    stdio: 'inherit',
    cwd: directory,
  })
}

export const execDocker = async (
  args: string[],
  { capture = false } = {},
) => {
  return execa('docker', args, {
    stdio: capture ? 'pipe' : 'inherit',
  })
}