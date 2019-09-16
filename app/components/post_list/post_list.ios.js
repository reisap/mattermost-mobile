// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, StyleSheet} from 'react-native';

import {debounce} from 'mattermost-redux/actions/helpers';

import {ListTypes} from 'app/constants';
import {THREAD} from 'app/constants/screen';
import {makeExtraData} from 'app/utils/list_view';

import PostListBase from './post_list_base';

const INITIAL_BATCH_TO_RENDER = 15;
const SCROLL_UP_MULTIPLIER = 3.5;
const SCROLL_POSITION_CONFIG = {

    // To avoid scrolling the list when new messages arrives
    // if the user is not at the bottom
    minIndexForVisible: 0,

    // If the user is at the bottom or 60px from the bottom
    // auto scroll show the new message
    autoscrollToTopThreshold: 60,
};

export default class PostList extends PostListBase {
    constructor(props) {
        super(props);

        this.hasDoneInitialScroll = false;
        this.contentOffsetY = 0;
        this.makeExtraData = makeExtraData();

        this.state = {
            managedConfig: {},
            postListHeight: 0,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelId !== nextProps.channelId) {
            this.contentOffsetY = 0;
            this.hasDoneInitialScroll = false;
        }
    }

    handleContentSizeChange = (contentWidth, contentHeight) => {
        this.scrollToInitialIndexIfNeeded(contentWidth, contentHeight);

        if (this.state.postListHeight && contentHeight < this.state.postListHeight && this.props.extraData) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
    };

    handleLayout = (event) => {
        const {height} = event.nativeEvent.layout;
        this.setState({postListHeight: height});
    };

    handleScroll = (event) => {
        const pageOffsetY = event.nativeEvent.contentOffset.y;
        const contentHeight = event.nativeEvent.contentSize.height;
        if (pageOffsetY > 0) {
            const direction = (this.contentOffsetY < pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_UP :
                ListTypes.VISIBILITY_SCROLL_DOWN;

            this.contentOffsetY = pageOffsetY;
            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (this.state.postListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                this.props.onLoadMoreUp();
            }
        } else if (pageOffsetY < 0) {
            if (this.state.postListHeight > contentHeight || this.props.location === THREAD) {
                // Posting a message like multiline or jumbo emojis causes the FlatList component for iOS
                // to render RefreshControl component and remain the space as is when it's unmounted,
                // leaving a whitespace of ~64 units of height between input box and post list.
                // This condition explicitly pull down the list to recent post when pageOffsetY is less than zero,
                // and the height of the layout is greater than its content or is on a thread screen.
                this.handleScrollToRecentPost();
            }
        }
    };

    handleScrollToRecentPost = debounce(() => {
        const postList = this.refs.list;
        if (postList.data && postList.data.length > 0) {
            postList.scrollToIndex({
                animated: true,
                index: 0,
                viewPosition: 1,
            });
        }
    }, 100);

    handleScrollToIndexFailed = () => {
        requestAnimationFrame(() => {
            this.hasDoneInitialScroll = false;
            this.scrollToInitialIndexIfNeeded(1, 1);
        });
    };

    scrollToInitialIndexIfNeeded = (width, height) => {
        if (
            width > 0 &&
            height > 0 &&
            this.props.initialIndex > 0 &&
            !this.hasDoneInitialScroll
        ) {
            this.refs.list.scrollToIndex({
                animated: false,
                index: this.props.initialIndex,
                viewPosition: 0.5,
            });
            this.hasDoneInitialScroll = true;
        }
    };

    render() {
        const {
            channelId,
            highlightPostId,
            postIds,
            refreshing,
        } = this.props;

        const refreshControl = {refreshing};

        if (channelId) {
            refreshControl.onRefresh = this.handleRefresh;
        }

        const hasPostsKey = postIds.length ? 'true' : 'false';

        return (
            <FlatList
                key={`recyclerFor-${channelId}-${hasPostsKey}`}
                ref='list'
                contentContainerStyle={styles.postListContent}
                data={postIds}
                extraData={this.makeExtraData(channelId, highlightPostId, this.props.extraData)}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                inverted={true}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.props.renderFooter}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onContentSizeChange={this.handleContentSizeChange}
                onLayout={this.handleLayout}
                onScroll={this.handleScroll}
                onScrollToIndexFailed={this.handleScrollToIndexFailed}
                removeClippedSubviews={true}
                renderItem={this.renderItem}
                scrollEventThrottle={60}
                {...refreshControl}
            />
        );
    }
}

const styles = StyleSheet.create({
    postListContent: {
        paddingTop: 5,
    },
});
