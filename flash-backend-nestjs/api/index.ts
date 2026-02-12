import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as express from 'express';

let app: any;

async function createApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: false,
    });

    // Increase body size limit for Vercel
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ limit: '100mb', extended: true }));

    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors({
      origin: true,
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('Nizron ERP API')
      .setDescription('Backend API for Nizron ERP System')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    await app.init();
  }
  return app;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  const nestApp = await createApp();
  return nestApp.getHttpAdapter().getInstance()(req, res);
};
