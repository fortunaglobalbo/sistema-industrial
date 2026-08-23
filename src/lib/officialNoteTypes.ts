export interface OfficialNoteInput {
  noteNumber: string;
  issueDate: string;
  recipientName: string;
  recipientRole: string;
  viaName: string;
  viaRole: string;
  senderName: string;
  senderRole: string;
  objectTitle: string;
  introParagraph: string;
  legalParagraph: string;
  attachedDocuments: string[];
  closingParagraph: string;
  includeFooterCopy: boolean;
}

export interface OfficialNoteData extends OfficialNoteInput {
  id: string;
  status: string;
  created_at: string;
}
