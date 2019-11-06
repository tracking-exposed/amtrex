import React from 'react';
import config from '../../../config';
import { Card } from 'material-ui/Card';
import $ from 'jquery';

const cardStyle = {
    'textAlign': "center"
};

const InfoBox = React.createClass({

    render () {
        const personalLink = config.WEB_ROOT + '/personal/#' + this.props.publicKey;

        return (
            <Card>
                <a target='_blank' href={personalLink}>
                <h1 style={cardStyle}>No one except researchers should use this extension!</h1>
                <p>Currently, we lack documenting the proper data processing; therefore this extension is not ready to be used</p>
                <p>If you use this, it is because you are collaborating with the development team.</p>
                </a>
            </Card>
        );
    }
});

export default InfoBox;
