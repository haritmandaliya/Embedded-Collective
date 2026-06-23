interface GoogleCredentialResponse {
  credential: string
}

interface GoogleButtonConfig {
  type?: string
  theme?: string
  size?: string
  text?: string
  shape?: string
  width?: number
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    auto_select?: boolean
  }) => void
  prompt: (momentListener?: (notification: {
    isNotDisplayed: () => boolean
    isSkippedMoment: () => boolean
  }) => void) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}
