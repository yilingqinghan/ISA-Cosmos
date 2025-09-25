export function classNames(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}
