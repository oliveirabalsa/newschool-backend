import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { Connection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional-cls-hooked';
import { Role } from '../../src/SecurityModule/entity/role.entity';
import { RoleEnum } from '../../src/SecurityModule/enum/role.enum';
import { ClientCredentials } from '../../src/SecurityModule/entity/client-credentials.entity';
import { ClientCredentialsEnum } from '../../src/SecurityModule/enum/client-credentials.enum';
import { GrantTypeEnum } from '../../src/SecurityModule/enum/grant-type.enum';
import { NewCourseDTO } from '../../src/CourseModule/dto/new-course.dto';
import { Constants } from '../../src/CommonsModule/constants';
import { NewUserDTO } from '../../src/UserModule/dto/new-user.dto';
import { User } from '../../src/UserModule/entity/user.entity';
import { Part } from '../../src/CourseModule/entity/part.entity';
import { GenderEnum } from '../../src/UserModule/enum/gender.enum';
import { EscolarityEnum } from '../../src/UserModule/enum/escolarity.enum';
import { UserProfileEnum } from '../../src/UserModule/enum/user-profile.enum';
import { AddCommentDTO } from '../../src/CourseModule/dto/add-comment.dto';
import { UserService } from '../../src/UserModule/service/user.service';
import { CourseService } from '../../src/CourseModule/service/course.service';
import { CourseTakenService } from '../../src/CourseModule/service/course.taken.service';
import { PartService } from '../../src/CourseModule/service/part.service';
import { LessonService } from '../../src/CourseModule/service/lesson.service';
import { REQUEST } from '@nestjs/core';
import { UploadService } from '../../src/UploadModule/service/upload.service';
import { LikeCommentDTO } from '../../src/CourseModule/dto/like-comment.dto';

const stringToBase64 = (string: string) => {
  return Buffer.from(string).toString('base64');
};

describe('CommentController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let authorization: string;
  const commentUrl = `/${Constants.API_PREFIX}/${Constants.API_VERSION_1}/${Constants.COMMENT_ENDPOINT}`;
  const studentRoleEnum: RoleEnum = RoleEnum.STUDENT;

  let dbConnection: Connection;

  let addedUser: User;
  let addedPart: Part;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REQUEST)
      .useValue({
        headers: {
          authorization:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOiIyMDIwLTA4LTI3VDEzOjM5OjA5LjkzN1oiLCJ1cGRhdGVkQXQiOiIyMDIwLTA4LTI3VDEzOjM5OjA5LjkzN1oiLCJ2ZXJzaW9uIjoxLCJpZCI6IjUyNTM4YWI5LThlMzAtNGViYS04ZGVhLTkwYTJlNDJlMzViNSIsIm5hbWUiOiJMZW9uYXJkbyAiLCJlbWFpbCI6Imxlb0BsZW8uY29tIiwicHJvZmlsZSI6IlNUVURFTlQiLCJwYXNzd29yZCI6IjVjOGVhMjVkNzFlMmU3NDE2M2VmYmU3NzkxYjM4OTFiZmJlZGYxOWNiMmExMTFlM2I3Y2ZhZTc4YjE0NTY0YjgxN2ZjYjMyNmZkMzVkM2Q1OTlhODI3OGE4OTk3ZDNiOGJjMjlkMTQ3NDk4MGI5ODc2NjdlNmQ4NWE3ODI3NzM3Iiwibmlja25hbWUiOiJMZW8iLCJiaXJ0aGRheSI6IjE5OTgtMTItMjZUMDI6MDA6MDAuMDAwWiIsImdlbmRlciI6Ik1BTEUiLCJzY2hvb2xpbmciOiJGQUNVTERBREVfQ1VSU0FORE8iLCJpbnN0aXR1dGlvbk5hbWUiOiJHRVJBTERJTk8gRE9TIFNBTlRPUyBERVBVVEFETyIsInByb2Zlc3Npb24iOiJEZXNlbnZvbHZlZG9yIiwiYWRkcmVzcyI6IkphcmRpbSBzYW50byBhbmRyw6ksIFPDo28gUGF1bG8gLSBTw6NvIFBhdWxvLCBCcmFzaWwiLCJ1cmxGYWNlYm9vayI6IiIsInVybEluc3RhZ3JhbSI6IiIsInNhbHQiOiIzOGVhZDJiNmJlZTczZTA3MDI3NjIwNTQyZDQ3ZWIxMiIsImVuYWJsZWQiOmZhbHNlLCJmYWNlYm9va0lkIjpudWxsLCJnb29nbGVTdWIiOm51bGwsInJvbGUiOnsiY3JlYXRlZEF0IjoiMjAyMC0wOC0xMVQxMjo1MDowNS40NTdaIiwidXBkYXRlZEF0IjoiMjAyMC0wOC0xMVQxMjo1MDowNS40NTdaIiwidmVyc2lvbiI6MSwiaWQiOiIxMDJmYmY4Ni1iNmVlLTQwMWYtODViNC0wZDM3MTNkMjkzOGYiLCJuYW1lIjoiQURNSU4ifSwiaWF0IjoxNjAxMzQ0MjYxLCJleHAiOjE2MDEzNDc4NjF9.w9EI130lFaR4aEIw6EcnvEW7nmCsiKK2FTD9e9cPRig',
        },
      })
      .overrideProvider(UploadService)
      .useValue({
        getUserPhoto() {
          return Promise.resolve('photo url');
        },
      })
      .compile();

    initializeTransactionalContext();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dbConnection = moduleFixture.get(Connection);
    await dbConnection.synchronize(true);

    const roleRepository: Repository<Role> = moduleFixture.get<
      Repository<Role>
    >(getRepositoryToken(Role));
    let roleAdmin = await roleRepository.findOne({ name: RoleEnum.ADMIN });
    if (!roleAdmin) {
      const role: Role = new Role();
      role.name = RoleEnum.STUDENT;
      roleAdmin = await roleRepository.save(role);
    }

    const clientCredentialRepository: Repository<ClientCredentials> = moduleFixture.get<
      Repository<ClientCredentials>
    >(getRepositoryToken(ClientCredentials));
    let clientCredentials = await clientCredentialRepository.findOne({
      name: ClientCredentialsEnum['NEWSCHOOL@FRONT'],
    });
    if (!clientCredentials) {
      clientCredentials = new ClientCredentials();
      clientCredentials.name = ClientCredentialsEnum['NEWSCHOOL@FRONT'];
      clientCredentials.secret = 'test2';
      clientCredentials.role = roleAdmin;
      clientCredentials.authorizedGrantTypes = [
        GrantTypeEnum.CLIENT_CREDENTIALS,
      ];
      clientCredentials.accessTokenValidity = 3600;
      clientCredentials.refreshTokenValidity = 3600;
      await clientCredentialRepository.save(clientCredentials);
    }
    authorization = stringToBase64(
      `${clientCredentials.name}:${clientCredentials.secret}`,
    );

    const userService: UserService = moduleFixture.get<UserService>(
      UserService,
    );

    const newUser: NewUserDTO = {
      email: 'my-user1@email.com',
      password: 'mypass',
      profile: UserProfileEnum.STUDENT,
      urlInstagram: 'instagram',
      urlFacebook: 'facebook',
      name: 'name',
      nickname: 'random nickname',
      gender: GenderEnum.MALE,
      schooling: EscolarityEnum.ENSINO_FUNDAMENTAL_COMPLETO,
      profession: 'random profession',
      birthday: new Date(),
      address: 'random adress',
      institutionName: 'random institution',
      role: studentRoleEnum,
    };
    addedUser = await userService.add(newUser);

    const courseService: CourseService = moduleFixture.get<CourseService>(
      CourseService,
    );

    const newCourse: NewCourseDTO = {
      title: 'Teste coursetaken E2E to add',
      thumbUrl: 'http://teste.com/thumb.png',
      authorName: 'Test',
      authorDescription: 'Test description',
      description: 'Este é um registro de teste',
      workload: 1,
    };
    const addedCourse = await courseService.add(newCourse, {
      filename: 'teste',
    });

    const courseTakenService: CourseTakenService = moduleFixture.get<
      CourseTakenService
    >(CourseTakenService);

    const newCourseTaken = {
      userId: addedUser.id,
      courseId: addedCourse.id,
    };
    await courseTakenService.add(newCourseTaken);

    const lessonService: LessonService = moduleFixture.get<LessonService>(
      LessonService,
    );

    const addedLesson = await lessonService.add({
      title: 'lesson test1',
      description: 'lesson test1 description',
      courseId: addedCourse.id,
    });

    const partService: PartService = moduleFixture.get<PartService>(
      PartService,
    );

    addedPart = await partService.add({
      vimeoUrl: 'randomUrl',
      title: 'new part1',
      description: 'new part1 description',
      lessonId: addedLesson.id,
    });
  });

  it('should add comment', async (done) => {
    const oauthRequest = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('Authorization', `Basic ${authorization}`)
      .set('Content-Type', 'multipart/form-data')
      .field('grant_type', GrantTypeEnum.CLIENT_CREDENTIALS);

    const addComentBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentRequest = await request(app.getHttpServer())
      .post(commentUrl)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addComentBody);

    expect(addCommentRequest.body.user.id).toBe(addedUser.id);
    expect(addCommentRequest.body.responses).toStrictEqual([]);
    expect(addCommentRequest.body.likedBy).toStrictEqual([]);
    expect(addCommentRequest.body.part.id).toBe(addedPart.id);
    expect(addCommentRequest.body.text).toBe(addComentBody.text);
    done();
  });

  it('should like comment', async (done) => {
    const oauthRequest = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('Authorization', `Basic ${authorization}`)
      .set('Content-Type', 'multipart/form-data')
      .field('grant_type', GrantTypeEnum.CLIENT_CREDENTIALS);

    const addComentBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentRequest = await request(app.getHttpServer())
      .post(commentUrl)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addComentBody);

    const likeComentBody: LikeCommentDTO = {
      userId: addedUser.id,
    };

    await request(app.getHttpServer())
      .post(`${commentUrl}/${addCommentRequest.body.id}/like`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(likeComentBody);

    const getCommentRequest = await request(app.getHttpServer())
      .get(`${commentUrl}/part/${addedPart.id}`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`);

    const filterComments = getCommentRequest.body.filter(
      (comment) => comment.id === addCommentRequest.body.id,
    );
    const comment = filterComments[0];

    expect(comment.likedBy.length).toBe(1);
    expect(comment.likedBy[0].id).toBe(addedUser.id);
    done();
  });

  it('should add a response to a comment', async (done) => {
    const oauthRequest = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('Authorization', `Basic ${authorization}`)
      .set('Content-Type', 'multipart/form-data')
      .field('grant_type', GrantTypeEnum.CLIENT_CREDENTIALS);

    const addComentBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentRequest = await request(app.getHttpServer())
      .post(commentUrl)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addComentBody);

    const addCommentResponseBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentResponseRequest = await request(app.getHttpServer())
      .post(`${commentUrl}/${addCommentRequest.body.id}/response`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addCommentResponseBody);

    expect(addCommentResponseRequest.body.parentComment.responses.length).toBe(
      0,
    );
    expect(addCommentResponseRequest.body.parentComment.id).toBe(
      addCommentRequest.body.id,
    );

    const getParentCommentResponsesRequest = await request(app.getHttpServer())
      .get(`${commentUrl}/${addCommentRequest.body.id}/response`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`);

    expect(getParentCommentResponsesRequest.body.responses.length).toBe(1);

    done();
  });

  it('should not be able to add a response to a response', async (done) => {
    const oauthRequest = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('Authorization', `Basic ${authorization}`)
      .set('Content-Type', 'multipart/form-data')
      .field('grant_type', GrantTypeEnum.CLIENT_CREDENTIALS);

    const addComentBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentRequest = await request(app.getHttpServer())
      .post(commentUrl)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addComentBody);

    const addCommentResponseBody: AddCommentDTO = {
      partId: addedPart.id,
      text: 'random text',
      userId: addedUser.id,
    };

    const addCommentResponseRequest = await request(app.getHttpServer())
      .post(`${commentUrl}/${addCommentRequest.body.id}/response`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addCommentResponseBody);

    const addResponseToResponseRequest = await request(app.getHttpServer())
      .post(`${commentUrl}/${addCommentResponseRequest.body.id}/response`)
      .set('Authorization', `Bearer ${oauthRequest.body.accessToken}`)
      .send(addCommentResponseBody);

    expect(addResponseToResponseRequest.status).toBe(400);

    done();
  });

  afterAll(async () => {
    await app.close();
  });
});
