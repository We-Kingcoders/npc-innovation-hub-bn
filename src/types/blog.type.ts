export interface BlogAttributes {
  id: string
  title: string
  content: string
  summary: string
  image?: string
  category: 'Cyber security' | 'Front-end' | 'Back-end'
  authorId: string
  isPublished: boolean
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

export interface BlogCreationAttributes {
  title: string
  content: string
  summary: string
  image?: string
  category: 'Cyber security' | 'Front-end' | 'Back-end'
  authorId: string
  isPublished?: boolean
}