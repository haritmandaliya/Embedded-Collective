interface AvatarUser {
  display_name?: string
  username?: string
  profile_pic_url?: string
}

interface AvatarProps {
  user?: AvatarUser | null
  size?: number
  className?: string
}

export function Avatar({ user, size = 32, className = '' }: AvatarProps) {
  const initials = (user?.display_name || user?.username || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (user?.profile_pic_url) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.display_name || user.username || 'User'}
        className={`rounded-full object-cover ring-2 ring-[--red-core]/20 ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
        }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-[--red-core]/15 border border-[--red-core]/30 flex items-center justify-center font-mono font-bold text-[--red-core] select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.35) }}
    >
      {initials}
    </div>
  )
}
