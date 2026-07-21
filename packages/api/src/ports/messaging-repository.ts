export type DirectMessage = {
  id: string;
  coachId: string;
  playerId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type DirectMessageThread = {
  playerId: string;
  lastMessage: string;
  lastAt: string;
};

export type MessagingRepository = {
  listDirectMessages(coachId: string, playerId: string): Promise<DirectMessage[]>;
  sendDirectMessage(input: {
    coachId: string;
    playerId: string;
    body: string;
  }): Promise<DirectMessage>;
  listDirectThreads(coachId: string): Promise<DirectMessageThread[]>;
};
