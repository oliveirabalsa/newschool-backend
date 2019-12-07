import * as crypto from 'crypto';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Audit } from '../../CommonsModule';
import { RoleEnum } from '../../SecurityModule/enum';
import { Role } from '../../SecurityModule/entity';

@Entity()
export class User extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
  })
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ name: 'url_facebook' })
  urlFacebook: string;

  @Column({ name: 'url_instagram' })
  urlInstagram: string;

  @Column({
    default: '',
  })
  salt: string;

  @ManyToOne(() => Role, (role: Role) => role.users)
  role: Role;

  validPassword(password: string) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
    return this.password === hash;
  }
}
