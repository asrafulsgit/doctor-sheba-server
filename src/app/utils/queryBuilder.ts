type QueryParams = Record<string, any>;

class QueryBuilder {
  private query: any = {};
  private options: any = {};
  private queryParams: QueryParams = {};

  constructor(queryParams: QueryParams) {
    this.queryParams = queryParams;
  }

  search(fields: string[]) {
    if (this.queryParams.searchTerm) {
      this.query.OR = fields.map((field) => ({
        [field]: {
          contains: this.queryParams.searchTerm,
          mode: "insensitive",
        },
      }));
    }
    return this;
  }

  filter() {
    const excludedFields = [
      "searchTerm",
      "sortBy",
      "sortOrder",
      "startDate",
      "specialty",
      "endDate",
      "maxFee",
      "minFee",
      "page",
      "limit",
    ];
    const filters = { ...this.queryParams };
    excludedFields.forEach((field) => delete filters[field]);

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== "") {
        let value: any = filters[key];

        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (!isNaN(value) && value !== "") value = Number(value);

        this.query[key] = value;
      }
    });

    return this;
  }

  sort() {
    const sortBy = this.queryParams.sortBy || "createdAt";
    const sortOrder = this.queryParams.sortOrder || "desc";

    this.options.orderBy = {
      [sortBy]: sortOrder,
    };

    return this;
  }

  pagination() {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    this.options.skip = skip;
    this.options.take = limit;

    return this;
  }

  build() {
    return {
      where: this.query,
      options : this.options,
    };
  }
}

export default QueryBuilder;
