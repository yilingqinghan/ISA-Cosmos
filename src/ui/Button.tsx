import { ButtonHTMLAttributes } from 'react'
import { classNames } from '@utils/classNames'

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props
  return (
    <button
      {...rest}
      className={classNames(
        'btn',
        className || ''
      )}
    />
  )
}
