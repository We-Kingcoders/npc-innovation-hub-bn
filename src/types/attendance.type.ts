export interface AttendanceAttributes {
  id: string;
  userId: string;
  eventId: string;
  status: 'going' | 'attended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceCreationAttributes {
  userId: string;
  eventId: string;
  status: 'going' | 'attended' | 'cancelled';
}