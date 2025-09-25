// src/ui/Toolbar.tsx
import React from 'react'
import cls from '@utils/classNames'

type DivProps = React.HTMLAttributes<HTMLDivElement>

type ToolbarProps = DivProps & {
  /** 紧凑模式（高度更小，间距更小） */
  compact?: boolean
  /** 浮动模式（常用于画布右上角悬浮工具条） */
  floating?: boolean
}

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, style, compact, floating, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        role="toolbar"
        className={cls(
          'toolbar',
          compact && 'toolbar--compact',
          floating && 'toolbar--floating',
          className
        )}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: compact ? '6px 8px' : '8px 10px',
          borderRadius: 10,
          background: 'linear-gradient(180deg,#ffffff,#f8fafc)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 6px 20px rgba(15,23,42,0.06)',
          border: '1px solid #e5e7eb',
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
Toolbar.displayName = 'Toolbar'

type GroupProps = DivProps & {
  /** 组标题（可选，等同于 <ToolbarTitle> children） */
  title?: React.ReactNode
}

export const ToolbarGroup: React.FC<GroupProps> = ({ className, style, title, children, ...rest }) => {
  return (
    <div
      className={cls('toolbar__group', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 4px',
        ...style,
      }}
      {...rest}
    >
      {title ? <ToolbarTitle style={{ marginRight: 6 }}>{title}</ToolbarTitle> : null}
      {children}
    </div>
  )
}

export const ToolbarDivider: React.FC<DivProps> = ({ className, style, ...rest }) => {
  return (
    <div
      aria-hidden
      className={cls('toolbar__divider', className)}
      style={{
        width: 1,
        alignSelf: 'stretch',
        background: 'linear-gradient(180deg,#e2e8f0,#cbd5e1)',
        opacity: 0.9,
        margin: '0 6px',
        ...style,
      }}
      {...rest}
    />
  )
}

export const ToolbarTitle: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <span
      className={cls('toolbar__title', className)}
      style={{
        color: '#0f172a',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}

export const LabelMuted: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <span
      className={cls('label-muted', className)}
      style={{
        color: '#475569',
        fontSize: 12,
        lineHeight: '20px',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}

export default Toolbar
