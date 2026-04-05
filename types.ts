
export interface PaperSection {
  heading: string;
  content: string;
}

export interface PaperData {
  title: string;
  abstract: string;
  sections: PaperSection[];
  references: string[];
}
