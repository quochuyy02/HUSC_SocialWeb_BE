/* eslint-disable camelcase */
const { Op, Sequelize } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const { Posts, User_saved_posts } = require('../models/models');
const AppError = require('../utils/appError');
const moment = require('moment');
const { Comments, Likes, Users } = require('../models/models');

exports.getPosts = catchAsync(async (req, res, next) => {
  const email = req.user.email;
  const limit = req.query.limit * 1 || 10;
  const page = req.query.page * 1 || 1;
  const userId = req.query.userId || null;
  const offset = (page - 1) * limit;
  const sorted = req.query.sorted;
  const newsfeed = await Posts.findAll({
    offset: offset,
    limit: limit,
    include: [
      { model: Comments, as: 'Comments' },
      { model: Likes, as: 'Likes' },
      {
        model: Users,
        as: 'user',
        attributes: [
          'user_id',
          'email',
          'first_name',
          'last_name',
          'profile_picture',
        ],
        where:
          sorted === 'community'
            ? { email: { [Op.like]: `${email.substring(0, 2)}%` } }
            : null,
      },
    ],
    attributes: ['title', 'tags', 'created_at', 'post_id'],
    order: [['created_at', 'DESC']],
  });
  //console.log(newsfeed);
  if (!newsfeed) return next(new AppError('Error while getting newsfeed', 404));

  const postsWithCounts = newsfeed.map((post) => {
    const commentCount = post.Comments.length;
    const likeCount = post.Likes.length;

    return {
      ...post.toJSON(),
      commentCount,
      likeCount,

      Comments: undefined,
      Likes: undefined,
      User: undefined,
    };
  });

  res.status(200).json({ status: 'success', data: postsWithCounts });
});

exports.createPost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { title, content, code, tags, created_at } = req.body;
  const post = await Posts.create({
    user_id,
    title,
    content,
    code,
    tags,
    created_at,
  });
  if (!post) {
    return next(new AppError('Error while creating post!', 500));
  }
  res.status(201).json({ status: 'success', data: post });
});
exports.getPostDetail = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const post = await Posts.findOne({
    where: { post_id: postId },
    include: [
      {
        model: Comments,
        as: 'Comments',
        include: [
          {
            model: Users,
            as: 'user',
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
            ],
          },
        ],
      },
      {
        model: Likes,
        as: 'Likes',
        include: [
          {
            model: Users,
            as: 'user',
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
            ],
          },
        ],
      },
      {
        model: Users,
        as: 'user',
        attributes: ['user_id', 'first_name', 'last_name', 'profile_picture'],
      },
      {
        model: User_saved_posts,
        as: 'User_saved_posts',
      },
    ],
  });
  if (!post) {
    return next(new AppError("Couldn't found post!", 404));
  }
  const postSanitized = post.get({ plain: true });
  const isLiked = !!postSanitized.Likes.find(
    (like) => like.user_id === req.user.user_id,
  );
  const isSaved = !!postSanitized.User_saved_posts.find(
    (user) => user.user_id === req.user.user_id,
  );
  postSanitized.isSaved = isSaved;
  postSanitized.isLiked = isLiked;
  res.status(200).json({ status: 'success', data: postSanitized });
});
exports.updatePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { title, content, code, update_at } = req.body;
  const post = await Posts.update(
    { title, content, code, update_at },
    { where: { post_id: postId } },
  );
  if (!post) {
    return next(new AppError('Error while updating post!', 500));
  }
  res.status(200).json({ status: 'success', data: post });
});

const isValidDate = (date, format = 'DD/MM/YYYY') => {
  return moment(date, format, true).isValid();
};
const extractTagValue = (input) => {
  const regex = /@(\w+):([^"]+)/g;
  const regex2 = /@(\w+):"([^"]*)"/g;
  let match;
  const searchValue = {};
  const allowedOptions = ['tag', 'user', 'comments', 'likes', 'profile'];
  while (
    (match = regex.exec(input)) !== null ||
    (match = regex2.exec(input)) !== null
  ) {
    const tag = match[0];
    const tagName = match[1];
    const tagValue = match[2];
    if (allowedOptions.includes(tagName)) {
      searchValue[tagName] = tagValue;
    }
    if (tagName === 'date' && isValidDate(tagValue)) {
      searchValue[tagName] = tagValue;
    }
    console.log(`Tag: ${tag}, Name: ${tagName}, Value: ${tagValue}`);
  }

  const generalSearch = input
    .replace(regex, '')
    .replace(regex2, '')
    .trim()
    .replace(/\s+/g, ' ');
  searchValue['general'] = generalSearch;
  console.log(searchValue);
  console.log(`General search: ${generalSearch}`);

  return searchValue;
};
exports.searchPost = catchAsync(async (req, res, next) => {
  const {
    general = null,
    tag = null,
    user = null,
    date = null,
  } = extractTagValue(req.query.q);
  if (general === null && tag === null && user === null && date === null) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide search criteria!',
    });
  }

  const searchCriteria = {};

  if (general !== null) {
    searchCriteria.title = {
      [Op.like]: `%${general}%`,
    };
    searchCriteria.content = {
      [Op.like]: `%${general}%`,
    };
  }

  if (tag !== null) {
    searchCriteria.tags = {
      [Op.like]: `%${tag}%`,
    };
  }
  const userCriteria = {};
  if (user !== null) {
    userCriteria[Op.or] = [
      Sequelize.where(
        Sequelize.fn(
          'concat',
          Sequelize.col('first_name'),
          ' ',
          Sequelize.col('last_name'),
        ),
        {
          [Op.like]: `%${user}%`,
        },
      ),
      Sequelize.where(
        Sequelize.fn(
          'concat',
          Sequelize.col('last_name'),
          ' ',
          Sequelize.col('first_name'),
        ),
        {
          [Op.like]: `%${user}%`,
        },
      ),
    ];
  }

  if (date !== null) {
    const unixDate = moment(date, 'DD/MM/YYYY').unix();
    searchCriteria.created_at = {
      [Op.gte]: unixDate,
    };
  }
  const limit = req.query.limit * 1 || 10;
  const page = req.query.page * 1 || 1;
  const offset = (page - 1) * limit;
  const isSorted = req.query.sorted === 'newest';
  const searchResult = await Posts.findAll({
    offset: offset,
    limit: limit,
    where: searchCriteria,
    include: [
      { model: Comments, as: 'Comments' },
      { model: Likes, as: 'Likes' },
      {
        model: Users,
        as: 'user',
        attributes: ['user_id', 'first_name', 'last_name', 'profile_picture'],
        where: userCriteria,
      },
    ],
    order: isSorted ? [['created_at', 'DESC']] : null,
  });
  // Query to get the total count
  const totalCount = await Posts.count({
    where: searchCriteria,
    include: [
      {
        model: Users,
        as: 'user',
        where: userCriteria,
      },
    ],
  });
  if (!searchResult)
    return next(new AppError('Error while getting newsfeed', 404));

  const postsWithCounts = searchResult.map((post) => {
    const commentCount = post.Comments.length;
    const likeCount = post.Likes.length;

    return {
      ...post.toJSON(),
      commentCount,
      likeCount,
      Comments: undefined,
      Likes: undefined,
      User: undefined,
    };
  });
  const totalPage = Math.ceil(totalCount / limit);
  res.status(200).json({
    status: 'success',
    data: postsWithCounts,
    page,
    totalPages: totalPage,
  });
});
exports.getUserPosts = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const posts = await Posts.findAll({
    where: { user_id: userId },
    include: [
      { model: Comments, as: 'Comments' },
      { model: Likes, as: 'Likes' },
      {
        model: Users,
        as: 'user',
        attributes: ['user_id', 'first_name', 'last_name', 'profile_picture'],
      },
    ],
  });
  if (!posts) {
    return next(new AppError('Error while getting user posts!', 500));
  }
  res.status(200).json({ status: 'success', data: posts });
});
exports.addComment = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id, content, created_at } = req.body;
  const comment = await Comments.create({
    user_id,
    post_id,
    content,
    created_at,
  });
  if (!comment) {
    return next(new AppError('Error while adding comment!', 500));
  }
  res.status(201).json({ status: 'success', data: comment });
});
exports.deleteComment = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { comment_id } = req.body;
  const comment = await Comments.destroy({
    where: { comment_id: comment_id, user_id: user_id },
  });
  if (!comment) {
    return next(new AppError('You are not able to do this!', 403));
  }
  res.status(204).json({ status: 'success', data: comment });
});
exports.editComment = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { comment_id, content, updated_at } = req.body;
  const comment = await Comments.update(
    { content, updated_at },
    { where: { comment_id: comment_id, user_id: user_id } },
  );
  if (!comment) {
    return next(new AppError('You are not able to do this!', 403));
  }
  res.status(200).json({ status: 'success' });
});

exports.likePost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id } = req.body;
  console.log(user_id, post_id);
  const like = await Likes.create({ user_id, post_id });
  res.status(201).json({ status: 'success', data: like });
});
exports.unlikePost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id } = req.body;
  const like = await Likes.destroy({ where: { user_id, post_id } });
  if (!like) return next(new AppError('Error while delete like!', 400));
  res.status(204).json({ status: 'success', data: like });
});
exports.deletePost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id } = req.body;
  Likes.destroy({
    where: { post_id: post_id },
  })
    .then(() =>
      Comments.destroy({
        where: { post_id: post_id },
      }),
    )
    .then(() =>
      User_saved_posts.destroy({
        where: { post_id: post_id },
      }),
    )
    .then(() =>
      Posts.destroy({
        where: { user_id: user_id, post_id: post_id },
      }),
    )
    .catch((err) => {
      console.log(err);
      return next(new AppError('Error while deleting post!', 400));
    });

  // const post = await Posts.destroy({
  //   where: { user_id, post_id },
  // // });
  // if (!post) return next(new AppError('Error while deleting post!', 400));
  res.status(204).json({ status: 'success', data: null });
});
exports.savePost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id } = req.body;
  const save = await User_saved_posts.create({ user_id, post_id });
  if (!save) return next(new AppError('Error while saving post!', 400));
  res.status(201).json({ status: 'success', data: save });
});
exports.unsavePost = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const { post_id } = req.body;
  const save = await User_saved_posts.destroy({ where: { user_id, post_id } });
  if (!save) return next(new AppError('Error while unsaving post!', 400));
  res.status(204).json({ status: 'success', data: save });
});
exports.getSavedPosts = catchAsync(async (req, res, next) => {
  const { user_id } = req.user;
  const limit = req.query.limit * 1 || 10;
  const page = req.query.page * 1 || 1;
  const offset = (page - 1) * limit;
  const savedPosts = await User_saved_posts.findAll({
    offset: offset,
    limit: limit,
    where: { user_id },
    include: [
      {
        model: Posts,
        as: 'post',
        include: [
          {
            model: Comments,
            as: 'Comments',
            attributes: [],
          },
          {
            model: Likes,
            as: 'Likes',
            attributes: [],
          },
          {
            model: Users,
            as: 'user',
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
            ],
          },
        ],
        attributes: [
          'post_id',
          'title',
          'tags',
          'created_at',
          [
            Sequelize.fn('COUNT', Sequelize.col('post->Comments.comment_id')),
            'commentCount',
          ],
          [
            Sequelize.fn('COUNT', Sequelize.col('post->Likes.post_id')),
            'likeCount',
          ],
        ],
      },
    ],
    group: ['User_saved_posts.post_id'],
  });
  if (!savedPosts)
    return next(new AppError('Error while getting saved posts!', 400));
  if (savedPosts[0].dataValues.post_id == null)
    return res.status(200).json({ status: 'success', data: [] });
  res.status(200).json({ status: 'success', data: savedPosts });
});
