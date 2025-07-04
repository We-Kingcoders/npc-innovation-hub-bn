export interface EventAttributes {
  id: string;
  title: string;
  location: string;
  description: string;
  startTime: Date;
  endTime: Date;
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCreationAttributes {
  title: string;
  location: string;
  description: string;
  startTime: Date;
  endTime: Date;
  imageUrl?: string;
  createdBy: string;
}