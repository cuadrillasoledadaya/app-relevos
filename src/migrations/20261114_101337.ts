import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_rol" AS ENUM('admin', 'jefe', 'costalero');
  CREATE TYPE "public"."enum_costaleros_hombro_preferido" AS ENUM('izquierdo', 'derecho');
  CREATE TYPE "public"."enum_pasos_trabajadoras_lado" AS ENUM('izquierda', 'derecha');
  CREATE TYPE "public"."enum_pasos_trabajadoras_tipo" AS ENUM('centro', 'cruz', 'tambor', 'puesto');
  CREATE TYPE "public"."enum_relevos_estado" AS ENUM('planificado', 'en_curso', 'completado', 'omitido');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rol" "enum_users_rol" DEFAULT 'costalero' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "cuadrillas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"color" varchar,
  	"notas" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "costaleros" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"cuadrilla_id" integer NOT NULL,
  	"telefono" varchar,
  	"altura_cm" numeric,
  	"hombro_preferido" "enum_costaleros_hombro_preferido",
  	"disponible" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pasos_trabajadoras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numero" numeric NOT NULL,
  	"lado" "enum_pasos_trabajadoras_lado" NOT NULL,
  	"tipo" "enum_pasos_trabajadoras_tipo" NOT NULL
  );
  
  CREATE TABLE "pasos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"hermandad" varchar,
  	"cuadrilla_id" integer NOT NULL,
  	"recorrido_metros" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "relevos_asignaciones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"costalero_id" integer NOT NULL,
  	"trabajadera_id" varchar NOT NULL
  );
  
  CREATE TABLE "relevos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"paso_id" integer NOT NULL,
  	"orden" numeric NOT NULL,
  	"punto_id" integer NOT NULL,
  	"cuadrilla_entrante_id" integer NOT NULL,
  	"cuadrilla_saliente_id" integer,
  	"estado" "enum_relevos_estado" DEFAULT 'planificado',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "puntos_de_relevo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"calle" varchar,
  	"orden" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_mcp_api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"users_find" boolean DEFAULT false,
  	"users_create" boolean DEFAULT false,
  	"users_update" boolean DEFAULT false,
  	"users_delete" boolean DEFAULT false,
  	"cuadrillas_find" boolean DEFAULT false,
  	"cuadrillas_create" boolean DEFAULT false,
  	"cuadrillas_update" boolean DEFAULT false,
  	"cuadrillas_delete" boolean DEFAULT false,
  	"costaleros_find" boolean DEFAULT false,
  	"costaleros_create" boolean DEFAULT false,
  	"costaleros_update" boolean DEFAULT false,
  	"costaleros_delete" boolean DEFAULT false,
  	"pasos_find" boolean DEFAULT false,
  	"pasos_create" boolean DEFAULT false,
  	"pasos_update" boolean DEFAULT false,
  	"pasos_delete" boolean DEFAULT false,
  	"relevos_find" boolean DEFAULT false,
  	"relevos_create" boolean DEFAULT false,
  	"relevos_update" boolean DEFAULT false,
  	"relevos_delete" boolean DEFAULT false,
  	"puntos_de_relevo_find" boolean DEFAULT false,
  	"puntos_de_relevo_create" boolean DEFAULT false,
  	"puntos_de_relevo_update" boolean DEFAULT false,
  	"puntos_de_relevo_delete" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"cuadrillas_id" integer,
  	"costaleros_id" integer,
  	"pasos_id" integer,
  	"relevos_id" integer,
  	"puntos_de_relevo_id" integer,
  	"payload_mcp_api_keys_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"payload_mcp_api_keys_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "costaleros" ADD CONSTRAINT "costaleros_cuadrilla_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pasos_trabajadoras" ADD CONSTRAINT "pasos_trabajadoras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pasos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pasos" ADD CONSTRAINT "pasos_cuadrilla_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos_asignaciones" ADD CONSTRAINT "relevos_asignaciones_costalero_id_costaleros_id_fk" FOREIGN KEY ("costalero_id") REFERENCES "public"."costaleros"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos_asignaciones" ADD CONSTRAINT "relevos_asignaciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."relevos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_paso_id_pasos_id_fk" FOREIGN KEY ("paso_id") REFERENCES "public"."pasos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_punto_id_puntos_de_relevo_id_fk" FOREIGN KEY ("punto_id") REFERENCES "public"."puntos_de_relevo"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_cuadrilla_entrante_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_entrante_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_cuadrilla_saliente_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_saliente_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_mcp_api_keys" ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cuadrillas_fk" FOREIGN KEY ("cuadrillas_id") REFERENCES "public"."cuadrillas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_costaleros_fk" FOREIGN KEY ("costaleros_id") REFERENCES "public"."costaleros"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pasos_fk" FOREIGN KEY ("pasos_id") REFERENCES "public"."pasos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_relevos_fk" FOREIGN KEY ("relevos_id") REFERENCES "public"."relevos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_puntos_de_relevo_fk" FOREIGN KEY ("puntos_de_relevo_id") REFERENCES "public"."puntos_de_relevo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "cuadrillas_updated_at_idx" ON "cuadrillas" USING btree ("updated_at");
  CREATE INDEX "cuadrillas_created_at_idx" ON "cuadrillas" USING btree ("created_at");
  CREATE INDEX "costaleros_cuadrilla_idx" ON "costaleros" USING btree ("cuadrilla_id");
  CREATE INDEX "costaleros_updated_at_idx" ON "costaleros" USING btree ("updated_at");
  CREATE INDEX "costaleros_created_at_idx" ON "costaleros" USING btree ("created_at");
  CREATE INDEX "pasos_trabajadoras_order_idx" ON "pasos_trabajadoras" USING btree ("_order");
  CREATE INDEX "pasos_trabajadoras_parent_id_idx" ON "pasos_trabajadoras" USING btree ("_parent_id");
  CREATE INDEX "pasos_cuadrilla_idx" ON "pasos" USING btree ("cuadrilla_id");
  CREATE INDEX "pasos_updated_at_idx" ON "pasos" USING btree ("updated_at");
  CREATE INDEX "pasos_created_at_idx" ON "pasos" USING btree ("created_at");
  CREATE INDEX "relevos_asignaciones_order_idx" ON "relevos_asignaciones" USING btree ("_order");
  CREATE INDEX "relevos_asignaciones_parent_id_idx" ON "relevos_asignaciones" USING btree ("_parent_id");
  CREATE INDEX "relevos_asignaciones_costalero_idx" ON "relevos_asignaciones" USING btree ("costalero_id");
  CREATE INDEX "relevos_paso_idx" ON "relevos" USING btree ("paso_id");
  CREATE INDEX "relevos_punto_idx" ON "relevos" USING btree ("punto_id");
  CREATE INDEX "relevos_cuadrilla_entrante_idx" ON "relevos" USING btree ("cuadrilla_entrante_id");
  CREATE INDEX "relevos_cuadrilla_saliente_idx" ON "relevos" USING btree ("cuadrilla_saliente_id");
  CREATE INDEX "relevos_updated_at_idx" ON "relevos" USING btree ("updated_at");
  CREATE INDEX "relevos_created_at_idx" ON "relevos" USING btree ("created_at");
  CREATE INDEX "puntos_de_relevo_updated_at_idx" ON "puntos_de_relevo" USING btree ("updated_at");
  CREATE INDEX "puntos_de_relevo_created_at_idx" ON "puntos_de_relevo" USING btree ("created_at");
  CREATE INDEX "payload_mcp_api_keys_user_idx" ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_cuadrillas_id_idx" ON "payload_locked_documents_rels" USING btree ("cuadrillas_id");
  CREATE INDEX "payload_locked_documents_rels_costaleros_id_idx" ON "payload_locked_documents_rels" USING btree ("costaleros_id");
  CREATE INDEX "payload_locked_documents_rels_pasos_id_idx" ON "payload_locked_documents_rels" USING btree ("pasos_id");
  CREATE INDEX "payload_locked_documents_rels_relevos_id_idx" ON "payload_locked_documents_rels" USING btree ("relevos_id");
  CREATE INDEX "payload_locked_documents_rels_puntos_de_relevo_id_idx" ON "payload_locked_documents_rels" USING btree ("puntos_de_relevo_id");
  CREATE INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx" ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "cuadrillas" CASCADE;
  DROP TABLE "costaleros" CASCADE;
  DROP TABLE "pasos_trabajadoras" CASCADE;
  DROP TABLE "pasos" CASCADE;
  DROP TABLE "relevos_asignaciones" CASCADE;
  DROP TABLE "relevos" CASCADE;
  DROP TABLE "puntos_de_relevo" CASCADE;
  DROP TABLE "payload_mcp_api_keys" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_rol";
  DROP TYPE "public"."enum_costaleros_hombro_preferido";
  DROP TYPE "public"."enum_pasos_trabajadoras_lado";
  DROP TYPE "public"."enum_pasos_trabajadoras_tipo";
  DROP TYPE "public"."enum_relevos_estado";`)
}
