export interface CreateMedicalReportInput {
  reportName: string;
}

export interface UpdateMedicalReportInput {
  reportName?: string;
}

export interface MedicalReportQuery {
  searchTerm?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}
