-- auto-generated definition
create table family_member
(
    id          int auto_increment
        primary key,
    name        varchar(50)                        not null,
    relation    varchar(30)                        null,
    username    varchar(50)                        not null comment '登录用户名',
    password    varchar(100)                       not null comment '登录密码（建议加密存储）',
    email       varchar(100)                       null comment '邮箱',
    is_admin    tinyint(1) default 0               not null comment '是否管理员（0-否，1-是，管理员可查看所有相册）',
    create_time datetime default CURRENT_TIMESTAMP null,
    constraint username
        unique (username)
);

-- auto-generated definition
create table favorite_folder
(
    id          int auto_increment
        primary key,
    folder_name varchar(100)                         not null comment '收藏夹名称',
    member_id   int                                  not null comment '所属用户ID（关联family_member.id）',
    is_default  tinyint(1) default 0                 not null comment '是否默认收藏夹（0-否，1-是）',
    create_time datetime   default CURRENT_TIMESTAMP null,
    constraint fk_favorite_folder_member
        foreign key (member_id) references family_member (id)
            on delete cascade
);

create index idx_favorite_folder_member
    on favorite_folder (member_id);

-- auto-generated definition
create table album
(
    id                  int auto_increment
        primary key,
    album_name          varchar(100)                             not null,
    description         text                                     null,
    create_time         datetime     default CURRENT_TIMESTAMP   null,
    cover_photo         varchar(255)                             null,
    cover_path          varchar(255) default 'default_cover.jpg' null comment '封面路径',
    creator_id          int                                      null comment '创建者ID（关联family_member.id）',
    last_upload_time    datetime                                 null comment '最后上传时间',
    last_upload_user_id int                                      null comment '最后上传人ID'
);



-- auto-generated definition
create table photo
(
    id          int auto_increment
        primary key,
    photo_name  varchar(100)                       not null,
    file_path   varchar(255)                       not null,
    shoot_time  datetime                           null,
    album_id    int                                null,
    member_id   int                                null,
    operator_id int                                null comment '上传者ID（关联family_member.id）',
    remarks     text                               null,
    upload_time datetime default CURRENT_TIMESTAMP null,
    constraint fk_photo_operator
        foreign key (operator_id) references family_member (id)
            on delete set null,
    constraint photo_ibfk_1
        foreign key (album_id) references album (id)
            on delete set null,
    constraint photo_ibfk_2
        foreign key (member_id) references family_member (id)
            on delete set null
);

create index album_id
    on photo (album_id);

create index member_id
    on photo (member_id);

-- auto-generated definition
create table favorite_photo
(
    id          int auto_increment
        primary key,
    folder_id   int                                not null comment '收藏夹ID（关联favorite_folder.id）',
    photo_id    int                                not null comment '照片ID（关联photo.id）',
    member_id   int                                not null comment '操作用户ID（防越权）',
    create_time datetime default CURRENT_TIMESTAMP null,
    constraint uk_folder_photo
        unique (folder_id, photo_id),
    constraint fk_favorite_photo_folder
        foreign key (folder_id) references favorite_folder (id)
            on delete cascade,
    constraint fk_favorite_photo_member
        foreign key (member_id) references family_member (id)
            on delete cascade,
    constraint fk_favorite_photo_photo
        foreign key (photo_id) references photo (id)
            on delete cascade
);

create index idx_favorite_photo_folder
    on favorite_photo (folder_id);

create index idx_favorite_photo_member
    on favorite_photo (member_id);

create index idx_favorite_photo_photo
    on favorite_photo (photo_id);

-- auto-generated definition
create table ai_chat_message
(
    id              bigint auto_increment comment '主键ID'
        primary key,
    member_id       int                                   not null comment '家庭成员ID（关联 family_member.id）',
    role            varchar(20)                           not null comment '消息角色：user=用户提问，assistant=AI回复，system=系统提示',
    content         text                                  not null comment '消息内容',
    conversation_id varchar(64) default 'default'         null comment '会话ID（预留扩展多会话），默认 default',
    create_time     datetime    default CURRENT_TIMESTAMP not null comment '消息创建时间'
)
    comment 'AI 聊天记录表' collate = utf8mb4_unicode_ci;

create index idx_conversation
    on ai_chat_message (member_id, conversation_id, create_time);

create index idx_create_time
    on ai_chat_message (create_time);

create index idx_member_time
    on ai_chat_message (member_id, create_time);



