export class User {
  userId: number;
  email: string;
  name: string;

  constructor(userId: number, email: string, name: string) {
    this.userId = userId;
    this.email = email;
    this.name = name;
  }
}
